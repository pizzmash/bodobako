import type { GameDefinition, GameStatus } from "../../types/game.js";
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
      winnerId: null,
    };
  },

  validateMove(state: AiueBattleState, move: unknown, playerId: string): boolean {
    // 型ガード: move が AiueBattleMove の基本構造を持つか確認
    if (typeof move !== "object" || move === null) return false;
    const m = move as Record<string, unknown>;
    if (typeof m.type !== "string") return false;

    if (state.finished) return false;
    if (!state.playerIds.includes(playerId)) return false;

    switch (state.phase) {
      case "topic-select": {
        if (m.type !== "select-topic") return false;
        if (typeof m.topic !== "string") return false;
        if (playerId !== state.topicSelectorId) return false;
        return m.topic.trim().length > 0;
      }

      case "word-input": {
        if (m.type !== "submit-word") return false;
        if (!Array.isArray(m.word)) return false;
        if (state.submittedPlayers.includes(playerId)) return false;
        return isValidWord(m.word as string[]);
      }

      case "battle": {
        if (m.type !== "attack") return false;
        if (typeof m.charIndex !== "number") return false;
        if (state.playerIds[state.currentPlayerIndex] !== playerId) return false;
        if (state.eliminatedPlayers.includes(playerId)) return false;
        if (m.charIndex < 0 || m.charIndex >= BOARD_CHARS.length) return false;
        return !state.usedChars[m.charIndex];
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
    if (!state.winnerId) return null;
    // 勝者を1位として返す（他のプレイヤーは敗者として同順位）
    const ranking = [state.winnerId];
    state.playerIds.forEach((id) => {
      if (id !== state.winnerId) ranking.push(id);
    });
    return ranking;
  },

  getCurrentPlayerId(state: AiueBattleState): string {
    if (state.phase === "topic-select") return state.topicSelectorId;
    if (state.phase === "word-input") {
      const notSubmitted = state.playerIds.find(
        (id) => !state.submittedPlayers.includes(id)
      );
      return notSubmitted ?? state.topicSelectorId;
    }
    return state.playerIds[state.currentPlayerIndex];
  },
};
