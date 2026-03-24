import type { CiaoCiaoState, DiceValue } from "./types.js";

/** サイコロを振る（1,2,3,4,x,x の均等分布） */
export function rollDice(): DiceValue {
  const faces: DiceValue[] = [1, 2, 3, 4, "x", "x"];
  return faces[Math.floor(Math.random() * faces.length)];
}

/**
 * 次のチャレンジャーを探す。
 * 手番プレイヤーの afterIndex の次（時計回り）から、チャレンジ可能なプレイヤーを探す。
 * チャレンジ可能 = 橋上にコマがある OR ゴール済みコマがある。
 * 手番プレイヤー本人は対象外。見つからなければ null。
 */
export function getNextChallengerIndex(
  state: CiaoCiaoState,
  afterIndex: number,
): number | null {
  const n = state.playerIds.length;
  const currentPid = state.playerIds[state.currentPlayerIndex];
  for (let i = 1; i < n; i++) {
    const idx = (afterIndex + i) % n;
    const pid = state.playerIds[idx];
    if (pid === currentPid) return null; // 手番プレイヤーに到達 → 全員巡回済み
    if (canChallenge(state, pid)) return idx;
  }
  return null;
}

/** プレイヤーがチャレンジ（「ウソだ！」）可能か。橋上にコマがある or ゴール済みコマがある */
export function canChallenge(state: CiaoCiaoState, playerId: string): boolean {
  return state.bridgePositions[playerId] !== null || (state.goals[playerId] ?? 0) > 0;
}

/**
 * declaring 直後の最初のチャレンジャーを探す。
 * 手番プレイヤーの「次」（左隣相当=index+1）から時計回り。
 */
export function getFirstChallengerIndex(state: CiaoCiaoState): number | null {
  return getNextChallengerIndex(state, state.currentPlayerIndex);
}

/**
 * 次のアクティブ（手番可能）プレイヤーのインデックスを探す。
 * 橋上にコマがある or ストックがあるプレイヤー。全員脱落なら null。
 */
export function getNextActivePlayerIndex(
  state: CiaoCiaoState,
  currentIndex: number,
): number | null {
  const n = state.playerIds.length;
  for (let i = 1; i <= n; i++) {
    const idx = (currentIndex + i) % n;
    const pid = state.playerIds[idx];
    if (state.bridgePositions[pid] !== null || state.stocks[pid] > 0) return idx;
  }
  return null;
}

/** プレイヤーが手番可能か（橋上コマあり or ストックあり） */
export function isPlayerActive(state: CiaoCiaoState, playerId: string): boolean {
  return state.bridgePositions[playerId] !== null || state.stocks[playerId] > 0;
}

/**
 * コマを前進させる。9を超えたらゴール到達。
 * state を破壊的に変更する（applyMove 内で shallow copy した後に呼ぶこと）。
 */
export function advancePiece(state: CiaoCiaoState, playerId: string, steps: number): void {
  const pos = state.bridgePositions[playerId];
  if (pos === null) return;
  const newPos = pos + steps;
  if (newPos > 9) {
    // ゴール到達
    state.bridgePositions[playerId] = null;
    state.goals[playerId] = (state.goals[playerId] ?? 0) + 1;
    const nextSlot = state.goalSlots.length + 1;
    state.goalSlots = [...state.goalSlots, { playerId, slot: nextSlot }];
    // ストックから補充
    replenishPiece(state, playerId);
  } else {
    state.bridgePositions[playerId] = newPos;
  }
}

/**
 * ストックからコマを補充（橋上にコマがなく、ストックが残っている場合）。
 * state を破壊的に変更する。
 */
export function replenishPiece(state: CiaoCiaoState, playerId: string): void {
  if (state.bridgePositions[playerId] === null && state.stocks[playerId] > 0) {
    state.stocks[playerId]--;
    state.bridgePositions[playerId] = 0;
  }
}

/** コマを橋から落とす。state を破壊的に変更する。 */
export function removePiece(state: CiaoCiaoState, playerId: string): void {
  state.bridgePositions[playerId] = null;
  replenishPiece(state, playerId);
}

/**
 * チャレンジに失敗したプレイヤーのペナルティ。
 * 橋上にコマがあれば落とす。なければゴール済みコマを1つ失う。
 * state を破壊的に変更する。
 */
export function penalizeChallenger(state: CiaoCiaoState, playerId: string): void {
  if (state.bridgePositions[playerId] !== null) {
    removePiece(state, playerId);
  } else if ((state.goals[playerId] ?? 0) > 0) {
    // ゴール済みコマを1つ失う（最もptが低い＝最小slotのものから失う）
    state.goals[playerId]--;
    const mySlots = state.goalSlots
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => s.playerId === playerId);
    if (mySlots.length > 0) {
      const minSlotEntry = mySlots.reduce((a, b) => (a.slot < b.slot ? a : b));
      state.goalSlots = state.goalSlots.filter((_, i) => i !== minSlotEntry.idx);
    }
  }
}

/** Array.findLastIndex polyfill */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

/**
 * ゲーム終了判定。
 * - 3ゴール → 即勝利
 * - 全員アクティブでない → ゴール数・スロット合計で順位
 */
export function checkGameEnd(state: CiaoCiaoState): {
  finished: boolean;
  winnerId: string | null;
} {
  // 3ゴール即勝利
  for (const pid of state.playerIds) {
    if (state.goals[pid] >= 3) {
      return { finished: true, winnerId: pid };
    }
  }

  // 全員脱落チェック
  const anyActive = state.playerIds.some((pid) => isPlayerActive(state, pid));
  if (!anyActive) {
    const winnerId = resolveWinnerByGoals(state);
    return { finished: true, winnerId };
  }

  return { finished: false, winnerId: null };
}

/** 全員脱落時のタイブレーク: ゴール数 → スロット合計の大きい順 */
function resolveWinnerByGoals(state: CiaoCiaoState): string | null {
  const scores = state.playerIds.map((pid) => {
    const goalCount = state.goals[pid] ?? 0;
    const slotSum = state.goalSlots
      .filter((s) => s.playerId === pid)
      .reduce((sum, s) => sum + s.slot, 0);
    return { pid, goalCount, slotSum };
  });

  scores.sort((a, b) => {
    if (b.goalCount !== a.goalCount) return b.goalCount - a.goalCount;
    return b.slotSum - a.slotSum;
  });

  // 全員0ゴールなら引き分け
  if (scores[0].goalCount === 0) return null;
  return scores[0].pid;
}

/** ランキング（順位）を生成する */
export function buildRanking(state: CiaoCiaoState): string[] | null {
  if (!state.finished) return null;
  // 即勝利の場合
  if (state.winnerId) {
    const others = state.playerIds.filter((pid) => pid !== state.winnerId);
    // 残りもゴール数→スロット合計順でソート
    const scores = others.map((pid) => {
      const goalCount = state.goals[pid] ?? 0;
      const slotSum = state.goalSlots
        .filter((s) => s.playerId === pid)
        .reduce((sum, s) => sum + s.slot, 0);
      return { pid, goalCount, slotSum };
    });
    scores.sort((a, b) => {
      if (b.goalCount !== a.goalCount) return b.goalCount - a.goalCount;
      return b.slotSum - a.slotSum;
    });
    return [state.winnerId, ...scores.map((s) => s.pid)];
  }
  // 引き分け
  return null;
}
