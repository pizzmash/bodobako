import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
import {
    advancePiece,
    buildRanking,
    checkGameEnd,
    getFirstChallengerIndex,
    getNextActivePlayerIndex,
    getNextChallengerIndex,
    penalizeChallenger,
    removePiece,
    replenishPiece,
    rollDice,
} from "./logic.js";
import type {
    ChallengeResult,
    CiaoCiaoMove,
    CiaoCiaoState,
    CiaoCiaoStateView,
} from "./types.js";

// ---------- バリデーションヘルパー ----------

function isDeclareValue(v: unknown): v is 1 | 2 | 3 | 4 {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

// ---------- Definition ----------

export const ciaoCiaoDefinition: GameDefinition<CiaoCiaoState, CiaoCiaoMove> = {
  id: "ciao-ciao",
  name: "チャオチャオ",
  description: "2〜4人、サイコロを振ってウソをつけ！橋を渡るブラフすごろく",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(playerIds: string[]): CiaoCiaoState {
    const bridgePositions: Record<string, number | null> = {};
    const goals: Record<string, number> = {};
    const stocks: Record<string, number> = {};
    for (const pid of playerIds) {
      bridgePositions[pid] = 0; // スタート地点
      goals[pid] = 0;
      stocks[pid] = 6; // 7個中1個はスタート地点に配置済み
    }
    return {
      playerIds,
      currentPlayerIndex: 0,
      phase: "rolling",
      diceRoll: null,
      declaredValue: null,
      currentChallengerIndex: null,
      challengeResult: null,
      bridgePositions,
      goals,
      goalSlots: [],
      stocks,
      finished: false,
      winnerId: null,
    };
  },

  parseMove(raw: unknown): CiaoCiaoMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;

    if (m.type === "roll") return { type: "roll" };
    if (m.type === "ack-reveal") return { type: "ack-reveal" };

    if (m.type === "declare") {
      if (!isDeclareValue(m.value)) return null;
      return { type: "declare", value: m.value };
    }

    if (m.type === "challenge") {
      if (m.action !== "trust" && m.action !== "call-liar") return null;
      return { type: "challenge", action: m.action };
    }

    return null;
  },

  validateMove(state: CiaoCiaoState, move: CiaoCiaoMove, playerId: string): boolean {
    if (state.finished) return false;

    const currentPid = state.playerIds[state.currentPlayerIndex];

    switch (move.type) {
      case "roll":
        return state.phase === "rolling" && playerId === currentPid;

      case "declare":
        return state.phase === "declaring" && playerId === currentPid;

      case "challenge": {
        if (state.phase !== "challenging") return false;
        if (state.currentChallengerIndex === null) return false;
        return playerId === state.playerIds[state.currentChallengerIndex];
      }

      case "ack-reveal":
        return state.phase === "revealing" && playerId === currentPid;

      default:
        return false;
    }
  },

  applyMove(state: CiaoCiaoState, move: CiaoCiaoMove, _playerId: string): CiaoCiaoState {
    switch (move.type) {
      case "roll":
        return applyRoll(state);
      case "declare":
        return applyDeclare(state, move.value);
      case "challenge":
        return applyChallenge(state, move.action);
      case "ack-reveal":
        return applyAckReveal(state);
      default:
        return state;
    }
  },

  getStatus(state: CiaoCiaoState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: CiaoCiaoState): string[] | null {
    return buildRanking(state);
  },

  getCurrentPlayerId(state: CiaoCiaoState): string {
    if (state.phase === "challenging" && state.currentChallengerIndex !== null) {
      return state.playerIds[state.currentChallengerIndex];
    }
    return state.playerIds[state.currentPlayerIndex];
  },

  getPlayerView(state: CiaoCiaoState, playerId: string): CiaoCiaoStateView {
    const currentPid = state.playerIds[state.currentPlayerIndex];
    const isCurrentPlayer = playerId === currentPid;
    const isRevealing = state.phase === "revealing";

    return {
      ...state,
      diceRoll: isCurrentPlayer || isRevealing ? state.diceRoll : null,
    };
  },

  getLogEntries(prevState: CiaoCiaoState, newState: CiaoCiaoState): GameLogEntry[] {
    const entries: GameLogEntry[] = [];

    // rolling → declaring（rollされただけ、ログ不要）
    if (prevState.phase === "rolling" && newState.phase === "declaring") {
      return entries;
    }

    // declaring → challenging or declaring → rolling（宣言ログ）
    if (prevState.phase === "declaring" && newState.declaredValue !== null) {
      const pid = newState.playerIds[newState.currentPlayerIndex];
      entries.push({
        playerId: pid,
        message: `「${newState.declaredValue}」と宣言`,
        tag: "宣言",
        tagColor: "#176a21",
      });
      return entries;
    }

    // challenging → challenging（trust → 次チャレンジャー）
    if (prevState.phase === "challenging" && newState.phase === "challenging"
        && prevState.currentChallengerIndex !== newState.currentChallengerIndex) {
      const prevIdx = prevState.currentChallengerIndex;
      if (prevIdx !== null) {
        entries.push({
          playerId: prevState.playerIds[prevIdx],
          message: "信じた",
          tag: "信頼",
          tagColor: "#d6e0cd",
        });
      }
      return entries;
    }

    // challenging → rolling（全員信じた → 前進確定）
    if (prevState.phase === "challenging" && newState.phase === "rolling"
        && newState.challengeResult === null) {
      const prevIdx = prevState.currentChallengerIndex;
      if (prevIdx !== null) {
        entries.push({
          playerId: prevState.playerIds[prevIdx],
          message: "信じた",
          tag: "信頼",
          tagColor: "#d6e0cd",
        });
      }
      // 前進ログ
      const currentPid = prevState.playerIds[prevState.currentPlayerIndex];
      entries.push({
        playerId: currentPid,
        message: `${prevState.declaredValue}マス前進`,
        tag: "前進",
        tagColor: "#176a21",
      });
      // ゴール判定ログ
      appendGoalLogs(entries, prevState, newState);
      return entries;
    }

    // challenging → revealing（call-liar）
    if (prevState.phase === "challenging" && newState.phase === "revealing") {
      const result = newState.challengeResult;
      if (result) {
        entries.push({
          playerId: result.challengerId,
          message: "「ウソだ！」",
          tag: "挑戦",
          tagColor: "#f95630",
        });
      }
      return entries;
    }

    // revealing → rolling / finished（ack-reveal 結果）
    if (prevState.phase === "revealing") {
      const result = prevState.challengeResult;
      if (result) {
        const rolledText = result.actualRoll === "x" ? "×" : String(result.actualRoll);
        if (result.wasLying) {
          entries.push({
            playerId: result.fallenPlayerId,
            message: `ウソだった！（出目: ${rolledText}）コマ落下`,
            tag: "落下",
            tagColor: "#b02500",
          });
          if (result.bonusMove !== null) {
            entries.push({
              playerId: result.challengerId,
              message: `${result.declaredValue}マス前進（ボーナス）`,
              tag: "前進",
              tagColor: "#176a21",
            });
          }
        } else {
          entries.push({
            playerId: result.fallenPlayerId,
            message: `本当だった！（出目: ${rolledText}）コマ落下`,
            tag: "落下",
            tagColor: "#b02500",
          });
          // 手番プレイヤーの前進ログ
          const currentPid = prevState.playerIds[prevState.currentPlayerIndex];
          entries.push({
            playerId: currentPid,
            message: `${result.declaredValue}マス前進`,
            tag: "前進",
            tagColor: "#176a21",
          });
        }
      }
      appendGoalLogs(entries, prevState, newState);
      appendEliminationLogs(entries, prevState, newState);
      return entries;
    }

    return entries;
  },
};

// ---------- ログヘルパー ----------

function appendGoalLogs(
  entries: GameLogEntry[],
  prevState: CiaoCiaoState,
  newState: CiaoCiaoState,
): void {
  for (const pid of newState.playerIds) {
    if ((newState.goals[pid] ?? 0) > (prevState.goals[pid] ?? 0)) {
      entries.push({
        playerId: pid,
        message: "ゴール到達！",
        tag: "到達",
        tagColor: "#176a21",
      });
    }
  }
}

function appendEliminationLogs(
  entries: GameLogEntry[],
  prevState: CiaoCiaoState,
  newState: CiaoCiaoState,
): void {
  for (const pid of newState.playerIds) {
    const hadPiece = prevState.bridgePositions[pid] !== null;
    const noPieceNow = newState.bridgePositions[pid] === null;
    const noStock = newState.stocks[pid] === 0;
    const noNewGoal = (newState.goals[pid] ?? 0) === (prevState.goals[pid] ?? 0);
    if (hadPiece && noPieceNow && noStock && noNewGoal) {
      entries.push({
        playerId: pid,
        message: "コマがなくなった",
        tag: "退場",
        tagColor: "#72796d",
      });
    }
  }
}

// ---------- applyMove 内部関数 ----------

/**
 * コマの前進を実行せずに宣言値のみセットするアプローチ。
 * 前進は全員信じた時 or ack-reveal で本当だった時に実行する。
 * これにより「ウソだった場合の前進取り消し」が不要になる。
 */

function applyRoll(state: CiaoCiaoState): CiaoCiaoState {
  const currentPid = state.playerIds[state.currentPlayerIndex];
  const newState = shallowClone(state);
  // 橋上にコマがない場合、ストックから補充
  if (newState.bridgePositions[currentPid] === null) {
    replenishPiece(newState, currentPid);
  }
  newState.diceRoll = rollDice();
  newState.phase = "declaring";
  return newState;
}

function applyDeclare(state: CiaoCiaoState, value: 1 | 2 | 3 | 4): CiaoCiaoState {
  const newState = shallowClone(state);
  newState.declaredValue = value;

  // コマは前進させない（チャレンジ解決後に前進）
  const firstChallenger = getFirstChallengerIndex(newState);
  if (firstChallenger === null) {
    // チャレンジ可能者なし → 即前進して次ターンへ
    const currentPid = state.playerIds[state.currentPlayerIndex];
    advancePiece(newState, currentPid, value);
    return finalizeTurn(newState);
  }

  newState.phase = "challenging";
  newState.currentChallengerIndex = firstChallenger;
  return newState;
}

function applyChallenge(
  state: CiaoCiaoState,
  action: "trust" | "call-liar",
): CiaoCiaoState {
  const newState = shallowClone(state);

  if (action === "trust") {
    const nextChallenger = getNextChallengerIndex(newState, state.currentChallengerIndex!);
    if (nextChallenger === null) {
      // 全員信じた → 前進確定して次ターンへ
      const currentPid = state.playerIds[state.currentPlayerIndex];
      advancePiece(newState, currentPid, state.declaredValue!);
      return finalizeTurn(newState);
    }
    newState.currentChallengerIndex = nextChallenger;
    return newState;
  }

  // call-liar
  const currentPid = state.playerIds[state.currentPlayerIndex];
  const challengerId = state.playerIds[state.currentChallengerIndex!];
  const actualRoll = state.diceRoll!;
  const declaredValue = state.declaredValue!;
  const wasLying = actualRoll === "x" || actualRoll !== declaredValue;

  // fallenFromPosition: UIアニメーション用
  // ウソだった場合 → 宣言位置（仮の前進位置）から落下する演出
  // 本当だった場合 → チャレンジャーの現在地から落下
  const currentPos = state.bridgePositions[currentPid] ?? 0;
  const result: ChallengeResult = {
    challengerId,
    actualRoll,
    declaredValue,
    wasLying,
    fallenPlayerId: wasLying ? currentPid : challengerId,
    fallenFromPosition: wasLying
      ? currentPos + declaredValue // 仮の前進位置
      : (state.bridgePositions[challengerId] ?? 0),
    bonusMove: wasLying ? declaredValue : null,
  };
  newState.challengeResult = result;
  newState.phase = "revealing";
  return newState;
}

function applyAckReveal(state: CiaoCiaoState): CiaoCiaoState {
  const result = state.challengeResult;
  if (!result) return state;

  const newState = shallowClone(state);
  const currentPid = state.playerIds[state.currentPlayerIndex];

  if (result.wasLying) {
    // 手番プレイヤーのコマを落とす（前進していないのでそのまま除去）
    removePiece(newState, currentPid);
    // チャレンジャーにボーナス移動
    if (result.bonusMove !== null) {
      advancePiece(newState, result.challengerId, result.bonusMove);
    }
  } else {
    // 手番プレイヤーの前進を確定
    advancePiece(newState, currentPid, result.declaredValue);
    // チャレンジャーのペナルティ（橋上コマ落下 or ゴール済みコマ没収）
    penalizeChallenger(newState, result.challengerId);
  }

  return finalizeTurn(newState);
}

/** ターン終了処理（ゲーム終了判定 → 次ターン遷移） */
function finalizeTurn(state: CiaoCiaoState): CiaoCiaoState {
  const endCheck = checkGameEnd(state);
  if (endCheck.finished) {
    state.finished = true;
    state.winnerId = endCheck.winnerId;
    return state;
  }

  const nextIdx = getNextActivePlayerIndex(state, state.currentPlayerIndex);
  if (nextIdx === null) {
    // 全員脱落（checkGameEnd で検出されるはずだが念のため）
    state.finished = true;
    state.winnerId = null;
    return state;
  }

  state.currentPlayerIndex = nextIdx;
  state.phase = "rolling";
  state.diceRoll = null;
  state.declaredValue = null;
  state.currentChallengerIndex = null;
  state.challengeResult = null;
  return state;
}

/** CiaoCiaoState の shallow clone（破壊的関数用） */
function shallowClone(state: CiaoCiaoState): CiaoCiaoState {
  return {
    ...state,
    bridgePositions: { ...state.bridgePositions },
    goals: { ...state.goals },
    goalSlots: [...state.goalSlots],
    stocks: { ...state.stocks },
  };
}
