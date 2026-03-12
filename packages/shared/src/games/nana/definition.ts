import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
import {
  checkWinCondition,
  createDeck,
  getActiveHandCard,
} from "./logic.js";
import type {
  NanaCard,
  NanaCardView,
  NanaMove,
  NanaState,
  NanaStateView,
  NanaTurnFlip,
} from "./types.js";

// ---- プレイヤー人数ごとの配布設定 ----
const HAND_SIZES: Record<number, number> = { 2: 10, 3: 8, 4: 7, 5: 6 };
const FIELD_SIZES: Record<number, number> = { 2: 10, 3: 9, 4: 8, 5: 6 };

/** state からカード ID で NanaCard を探す（applyMove 内部用） */
function findCard(state: NanaState, cardId: number): NanaCard {
  for (const card of state.fieldCards) {
    if (card?.id === cardId) return card;
  }
  for (const hand of Object.values(state.hands)) {
    const card = hand.find((c) => c.id === cardId);
    if (card) return card;
  }
  throw new Error(`Card not found: ${cardId}`);
}

export const nanaDefinition: GameDefinition<NanaState, NanaMove> = {
  id: "nana",
  name: "ナナ",
  description: "7をねらえ！3枚ペアの神経衰弱ゲーム",
  minPlayers: 2,
  maxPlayers: 5,

  createInitialState(playerIds: string[]): NanaState {
    const playerCount = playerIds.length;
    const handSize = HAND_SIZES[playerCount];
    const fieldSize = FIELD_SIZES[playerCount];

    const deck = createDeck(playerCount);

    let idx = 0;

    // 場札を配置
    const fieldCards: (NanaCard | null)[] = [];
    for (let i = 0; i < fieldSize; i++) {
      fieldCards.push(deck[idx++]);
    }

    // 手札を配布（昇順ソート）
    const hands: Record<string, NanaCard[]> = {};
    for (const playerId of playerIds) {
      const hand = deck.slice(idx, idx + handSize);
      hand.sort((a, b) => a.number - b.number);
      hands[playerId] = hand;
      idx += handSize;
    }

    return {
      playerIds,
      currentPlayerIndex: 0,
      fieldCards,
      hands,
      turnFlips: [],
      pendingResult: null,
      collectedSets: Object.fromEntries(playerIds.map((id) => [id, []])),
      winnerId: null,
      finished: false,
    };
  },

  parseMove(raw: unknown): NanaMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;

    if (m.type === "flip-field") {
      if (typeof m.fieldIndex !== "number") return null;
      if (!Number.isInteger(m.fieldIndex) || m.fieldIndex < 0) return null;
      return { type: "flip-field", fieldIndex: m.fieldIndex };
    }

    if (m.type === "flip-hand") {
      if (typeof m.targetPlayerId !== "string") return null;
      if (m.position !== "max" && m.position !== "min") return null;
      return {
        type: "flip-hand",
        targetPlayerId: m.targetPlayerId,
        position: m.position,
      };
    }

    if (m.type === "confirm") {
      return { type: "confirm" };
    }

    return null;
  },

  validateMove(state: NanaState, move: NanaMove, playerId: string): boolean {
    const pendingResult = state.pendingResult ?? null;
    const playerIndex = state.playerIds.indexOf(playerId);
    if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex)
      return false;
    if (state.finished) return false;
    if (move.type === "confirm") return pendingResult !== null;

    if (pendingResult !== null) return false;
    if (state.turnFlips.length >= 3) return false;

    const flippedIds = state.turnFlips.map((f) => f.cardId);
    const flippedSet = new Set(flippedIds);

    if (move.type === "flip-field") {
      const { fieldIndex } = move;
      if (fieldIndex < 0 || fieldIndex >= state.fieldCards.length) return false;
      const card = state.fieldCards[fieldIndex];
      if (!card) return false;
      if (flippedSet.has(card.id)) return false;
      return true;
    }

    // flip-hand
    const { targetPlayerId, position } = move;
    const hand = state.hands[targetPlayerId];
    if (!hand) return false;
    return getActiveHandCard(hand, flippedIds, position) !== null;
  },

  applyMove(state: NanaState, move: NanaMove, playerId: string): NanaState {
    const pendingResult = state.pendingResult ?? null;
    if (move.type === "confirm") {
      if (pendingResult === null) return state;

      if (pendingResult === "failure") {
        return {
          ...state,
          turnFlips: [],
          pendingResult: null,
          currentPlayerIndex: (state.currentPlayerIndex + 1) % state.playerIds.length,
        };
      }

      // success
      const numbers = state.turnFlips.map((f) => findCard(state, f.cardId).number);
      const firstNumber = numbers[0];

      const newFieldCards = [...state.fieldCards];
      const newHands: Record<string, NanaCard[]> = Object.fromEntries(
        Object.entries(state.hands).map(([pid, hand]) => [pid, [...hand]]),
      );

      for (const flip of state.turnFlips) {
        if (flip.source.type === "field") {
          newFieldCards[flip.source.index] = null;
        } else {
          const hand = newHands[flip.source.targetPlayerId];
          const idx = hand.findIndex((c) => c.id === flip.cardId);
          if (idx !== -1) hand.splice(idx, 1);
        }
      }

      const newCollectedSets = {
        ...state.collectedSets,
        [playerId]: [...state.collectedSets[playerId], firstNumber],
      };

      const won = checkWinCondition(newCollectedSets[playerId]);

      return {
        ...state,
        fieldCards: newFieldCards,
        hands: newHands,
        turnFlips: [],
        pendingResult: null,
        collectedSets: newCollectedSets,
        winnerId: won ? playerId : null,
        finished: won,
        currentPlayerIndex: won
          ? state.currentPlayerIndex
          : (state.currentPlayerIndex + 1) % state.playerIds.length,
      };
    }

    const flippedIds = state.turnFlips.map((f) => f.cardId);

    // めくるカードと flip エントリを決定
    let newFlip: NanaTurnFlip;
    if (move.type === "flip-field") {
      const card = state.fieldCards[move.fieldIndex]!;
      newFlip = {
        cardId: card.id,
        source: { type: "field", index: move.fieldIndex },
      };
    } else {
      const card = getActiveHandCard(
        state.hands[move.targetPlayerId],
        flippedIds,
        move.position,
      )!;
      newFlip = {
        cardId: card.id,
        source: { type: "hand", targetPlayerId: move.targetPlayerId, position: move.position },
      };
    }

    const newTurnFlips = [...state.turnFlips, newFlip];
    const flipCount = newTurnFlips.length;

    // めくったカードの数字を取得
    const numbers = newTurnFlips.map((f) => findCard(state, f.cardId).number);
    const firstNumber = numbers[0];
    const allSame = numbers.every((n) => n === firstNumber);

    // ---- 1枚目: 常に継続 ----
    if (flipCount === 1) {
      return { ...state, turnFlips: newTurnFlips };
    }

    // ---- 2枚目: 不一致 → 失敗 ----
    if (flipCount === 2 && !allSame) {
      return {
        ...state,
        turnFlips: newTurnFlips,
        pendingResult: "failure",
      };
    }

    // ---- 2枚目: 一致 → 継続 ----
    if (flipCount === 2) {
      return { ...state, turnFlips: newTurnFlips };
    }

    // ---- 3枚目: 不一致 → 失敗 ----
    if (!allSame) {
      return {
        ...state,
        turnFlips: newTurnFlips,
        pendingResult: "failure",
      };
    }
    // ---- 3枚目: 3枚一致 → 成功確認待ち ----
    return {
      ...state,
      turnFlips: newTurnFlips,
      pendingResult: "success",
    };
  },

  getStatus(state: NanaState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: NanaState): string[] | null {
    if (!state.finished || !state.winnerId) return null;
    const others = state.playerIds.filter((pid) => pid !== state.winnerId);
    return [state.winnerId, ...others];
  },

  getCurrentPlayerId(state: NanaState): string {
    return state.playerIds[state.currentPlayerIndex];
  },

  getLogEntries(prevState: NanaState, newState: NanaState): GameLogEntry[] {
    const entries: GameLogEntry[] = [];
    const prevPendingResult = prevState.pendingResult ?? null;
    const pendingResult = newState.pendingResult ?? null;

    if (newState.turnFlips.length > prevState.turnFlips.length) {
      const flip = newState.turnFlips[newState.turnFlips.length - 1];
      const actorPid = newState.playerIds[newState.currentPlayerIndex];
      const message =
        flip.source.type === "field"
          ? "場のカードをめくりました"
          : "プレイヤーのカードをめくりました";

      if (prevPendingResult === null && pendingResult === "failure") {
        entries.push({ playerId: actorPid, message, tag: "Miss", tagColor: "#2563eb" });
      } else {
        entries.push({ playerId: actorPid, message });
      }
      return entries;
    }

    if (prevPendingResult === null && pendingResult === "failure") {
      const actorPid = newState.playerIds[newState.currentPlayerIndex];
      const lastFlip = newState.turnFlips[newState.turnFlips.length - 1];
      if (!lastFlip) {
        entries.push({ playerId: actorPid, message: "ターン終了", tag: "Miss", tagColor: "#2563eb" });
      } else {
        const message =
          lastFlip.source.type === "field"
            ? "場のカードをめくりました"
            : "プレイヤーのカードをめくりました";
        entries.push({ playerId: actorPid, message, tag: "Miss", tagColor: "#2563eb" });
      }
      return entries;
    }

    // confirm後の成功（セット獲得）
    if (prevPendingResult === "success" && pendingResult === null) {
      for (const pid of newState.playerIds) {
        const prevLen = prevState.collectedSets[pid]?.length ?? 0;
        const nextLen = newState.collectedSets[pid]?.length ?? 0;
        if (nextLen > prevLen) {
          const num = newState.collectedSets[pid][nextLen - 1];
          entries.push({
            playerId: pid,
            message: `「${num}」のセットを獲得しました！`,
            tag: "Match",
            tagColor: "#16a34a",
          });
        }
      }
    }

    return entries;
  },

  getPlayerView(state: NanaState, playerId: string): NanaStateView {
    // 自分の手札は常に公開。今ターンめくり中のカードも全員に公開。
    const visibleIds = new Set<number>([
      ...state.turnFlips.map((f) => f.cardId),
      ...(state.hands[playerId] ?? []).map((c) => c.id),
    ]);

    const maskCard = (card: NanaCard): NanaCardView =>
      visibleIds.has(card.id)
        ? card
        : { id: card.id, number: null };

    const maskFieldCard = (card: NanaCard | null): NanaCardView | null =>
      card === null ? null : maskCard(card);

    return {
      ...state,
      pendingResult: state.pendingResult ?? null,
      fieldCards: state.fieldCards.map(maskFieldCard),
      hands: Object.fromEntries(
        Object.entries(state.hands).map(([pid, hand]) => [
          pid,
          hand.map(maskCard),
        ]),
      ),
    };
  },
};
