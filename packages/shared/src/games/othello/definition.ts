import type { GameDefinition, GameStatus } from "../../types/game.js";
import type { OthelloState, OthelloMove } from "./types.js";
import {
  createBoard,
  isValidMove,
  applyMoveToBoard,
  getValidMoves,
  countDiscs,
} from "./logic.js";

export const othelloDefinition: GameDefinition<OthelloState, OthelloMove> = {
  id: "othello",
  name: "オセロ",
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

  validateMove(state: OthelloState, move: OthelloMove, playerId: string): boolean {
    const playerIndex = state.playerIds.indexOf(playerId);
    if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return false;
    if (state.finished) return false;

    if (move.pass) {
      return getValidMoves(state.board, playerIndex).length === 0;
    }

    return isValidMove(state.board, move.row, move.col, playerIndex);
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

  getWinner(state: OthelloState): string | null {
    if (!state.finished) return null;
    const { black, white } = countDiscs(state.board);
    if (black > white) return state.playerIds[0];
    if (white > black) return state.playerIds[1];
    return null; // draw
  },

  getCurrentPlayerId(state: OthelloState): string {
    return state.playerIds[state.currentPlayerIndex];
  },
};
