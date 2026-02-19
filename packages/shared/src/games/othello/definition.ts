import type { GameDefinition, GameStatus } from "../../types/game.js";
import {
    applyMoveToBoard,
    countDiscs,
    createBoard,
    getValidMoves,
    isValidMove,
} from "./logic.js";
import type { OthelloMove, OthelloState } from "./types.js";

export const othelloDefinition: GameDefinition<OthelloState, OthelloMove> = {
  id: "othello",
  name: "オセロ",
  description: "8x8 盤面で石を挟んでひっくり返す定番ゲーム",
  minPlayers: 2,
  maxPlayers: 2,

  createInitialState(playerIds: string[]): OthelloState {
    return {
      board: createBoard(),
      currentPlayerIndex: 0,
      playerIds,
      passCount: 0,
      finished: false,
    };
  },

  validateMove(state: OthelloState, move: unknown, playerId: string): boolean {
    // 型ガード: move が OthelloMove の形であるか確認
    if (typeof move !== "object" || move === null) return false;
    const m = move as Record<string, unknown>;
    if (typeof m.pass !== "undefined" && typeof m.pass !== "boolean") return false;
    if (typeof m.row !== "undefined" && typeof m.row !== "number") return false;
    if (typeof m.col !== "undefined" && typeof m.col !== "number") return false;
    if (!m.pass && (typeof m.row !== "number" || typeof m.col !== "number")) return false;
    const typedMove = move as OthelloMove;

    const playerIndex = state.playerIds.indexOf(playerId);
    if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return false;
    if (state.finished) return false;

    if (typedMove.pass) {
      return getValidMoves(state.board, playerIndex).length === 0;
    }

    return isValidMove(state.board, typedMove.row, typedMove.col, playerIndex);
  },

  applyMove(state: OthelloState, move: OthelloMove, playerId: string): OthelloState {
    const playerIndex = state.playerIds.indexOf(playerId);

    if (move.pass) {
      const nextIndex = 1 - playerIndex;
      const newPassCount = state.passCount + 1;
      const finished = newPassCount >= 2;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        passCount: newPassCount,
        finished,
      };
    }

    const newBoard = applyMoveToBoard(state.board, move.row, move.col, playerIndex);
    const nextIndex = 1 - playerIndex;

    // Check if next player has valid moves
    const nextMoves = getValidMoves(newBoard, nextIndex);
    // Check if board is full
    const { black, white } = countDiscs(newBoard);
    const isFull = black + white === 64;

    return {
      ...state,
      board: newBoard,
      currentPlayerIndex: nextIndex,
      passCount: 0,
      finished: isFull || (nextMoves.length === 0 && getValidMoves(newBoard, playerIndex).length === 0),
    };
  },

  getStatus(state: OthelloState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: OthelloState): string[] | null {
    if (!state.finished) return null;
    const { black, white } = countDiscs(state.board);
    if (black === white) return null; // draw
    // 勝者を1位、敗者を2位として返す
    if (black > white) return [state.playerIds[0], state.playerIds[1]];
    return [state.playerIds[1], state.playerIds[0]];
  },

  getCurrentPlayerId(state: OthelloState): string {
    return state.playerIds[state.currentPlayerIndex];
  },
};
