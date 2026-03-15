import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
import { isValidWord, padWord, processAttack } from "./logic.js";
import type { AiueBattleMove, AiueBattleState } from "./types.js";
import { BOARD_CHARS, WORD_LENGTH } from "./types.js";

export const aiuebattleDefinition: GameDefinition<AiueBattleState, AiueBattleMove> = {
  id: "aiuebattle",
  name: "あいうえバトル",
  description: "お題に沿った言葉を書き、相手の文字を当てて攻撃するワードバトル",
  minPlayers: 2,
  maxPlayers: 5,

  createInitialState(playerIds: string[]): AiueBattleState {
    return {
      playerIds,
      phase: "topic-select",
      topic: null,
      topicSelectorId: playerIds[0],
      words: {},
      submittedPlayers: [],
      usedChars: Array(BOARD_CHARS.length).fill(false),
      currentPlayerIndex: 0,
      attackCount: 0,
      lastAttackHit: false,
      lastAttackChar: null,
      lastAttackPlayerId: null,
      revealed: {},
      eliminatedPlayers: [],
      eliminationOrder: [],
      finished: false,
    };
  },

  parseMove(raw: unknown): AiueBattleMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;
    if (typeof m.type !== "string") return null;
    switch (m.type) {
      case "select-topic":
        if (typeof m.topic !== "string") return null;
        return { type: "select-topic", topic: m.topic };
      case "submit-word":
        if (!Array.isArray(m.word)) return null;
        if (!m.word.every((c: unknown) => typeof c === "string")) return null;
        return { type: "submit-word", word: m.word as string[] };
      case "attack":
        if (typeof m.charIndex !== "number" || !Number.isInteger(m.charIndex)) return null;
        return { type: "attack", charIndex: m.charIndex };
      default:
        return null;
    }
  },

  validateMove(state: AiueBattleState, move: AiueBattleMove, playerId: string): boolean {
    if (state.finished) return false;
    if (!state.playerIds.includes(playerId)) return false;

    switch (state.phase) {
      case "topic-select": {
        if (move.type !== "select-topic") return false;
        if (playerId !== state.topicSelectorId) return false;
        return move.topic.trim().length > 0;
      }

      case "word-input": {
        if (move.type !== "submit-word") return false;
        if (state.submittedPlayers.includes(playerId)) return false;
        return isValidWord(move.word);
      }

      case "battle": {
        if (move.type !== "attack") return false;
        if (state.playerIds[state.currentPlayerIndex] !== playerId) return false;
        if (state.eliminatedPlayers.includes(playerId)) return false;
        if (move.charIndex < 0 || move.charIndex >= BOARD_CHARS.length) return false;
        return !state.usedChars[move.charIndex];
      }
    }
  },

  applyMove(state: AiueBattleState, move: AiueBattleMove, playerId: string): AiueBattleState {
    switch (state.phase) {
      case "topic-select": {
        const m = move as { type: "select-topic"; topic: string };
        return {
          ...state,
          phase: "word-input",
          topic: m.topic.trim(),
        };
      }

      case "word-input": {
        const m = move as { type: "submit-word"; word: string[] };
        const paddedWord = padWord(m.word);
        const newWords = { ...state.words, [playerId]: paddedWord };
        const newSubmitted = [...state.submittedPlayers, playerId];
        const newRevealed = {
          ...state.revealed,
          [playerId]: Array(WORD_LENGTH).fill(false),
        };

        if (newSubmitted.length === state.playerIds.length) {
          // All players submitted → transition to battle
          const startIndex = Math.floor(Math.random() * state.playerIds.length);
          return {
            ...state,
            phase: "battle",
            words: newWords,
            submittedPlayers: newSubmitted,
            revealed: newRevealed,
            currentPlayerIndex: startIndex,
          };
        }

        return {
          ...state,
          words: newWords,
          submittedPlayers: newSubmitted,
          revealed: newRevealed,
        };
      }

      case "battle": {
        const m = move as { type: "attack"; charIndex: number };
        return processAttack(state, m.charIndex, playerId);
      }
    }
  },

  getStatus(state: AiueBattleState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: AiueBattleState): string[] | null {
    if (!state.finished) return null;
    const active = state.playerIds.filter(
      (id) => !state.eliminatedPlayers.includes(id)
    );
    if (active.length === 1) {
      // 通常終了: 生き残り1人が勝者、脱落順の逆が続く
      return [active[0], ...[...state.eliminationOrder].reverse()];
    }
    // 全員同時脱落: eliminationOrder の末尾が勝者（processAttack で移動済み）
    const elimOrder = [...state.eliminationOrder];
    const winner = elimOrder.pop()!;
    return [winner, ...elimOrder.reverse()];
  },

  getCurrentPlayerId(state: AiueBattleState): string {
    if (state.phase === "topic-select") return state.topicSelectorId;
    if (state.phase === "word-input") return ""; // 全員同時入力フェーズ - 手番なし
    return state.playerIds[state.currentPlayerIndex];
  },

  getLogEntries(prevState: AiueBattleState, newState: AiueBattleState): GameLogEntry[] {
    const entries: GameLogEntry[] = [];

    // お題選択
    if (prevState.phase === "topic-select" && newState.phase === "word-input") {
      entries.push({
        playerId: prevState.topicSelectorId,
        message: `「${newState.topic}」をお題に選びました`,
      });
      return entries;
    }

    // 単語提出
    if (prevState.phase === "word-input") {
      const newlySubmitted = newState.submittedPlayers.filter(
        (id) => !prevState.submittedPlayers.includes(id)
      );
      for (const pid of newlySubmitted) {
        entries.push({ playerId: pid, message: "単語を送信しました" });
      }
      if (newState.phase === "battle") {
        entries.push({
          playerId: newState.playerIds[0]!,
          message: "バトル開始！",
          tag: "バトル",
          tagColor: "#dc2626",
        });
      }
      return entries;
    }

    // 攻撃
    if (prevState.phase === "battle" && newState.lastAttackChar !== null &&
        newState.lastAttackChar !== prevState.lastAttackChar) {
      const attackerId = prevState.playerIds[prevState.currentPlayerIndex]!;
      entries.push({
        playerId: attackerId,
        message: `「${newState.lastAttackChar}」を攻撃しました`,
        tag: newState.lastAttackHit ? "Hit" : "Miss",
        tagColor: newState.lastAttackHit ? "#dc2626" : "#6366f1",
      });
    }

    // 脱落
    const newlyEliminated = newState.eliminatedPlayers.filter(
      (id) => !prevState.eliminatedPlayers.includes(id)
    );
    for (const pid of newlyEliminated) {
      entries.push({ playerId: pid, message: "脱落しました", tag: "脱落", tagColor: "#9333ea" });
    }

    return entries;
  },
};
