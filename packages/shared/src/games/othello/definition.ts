import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
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

  parseMove(raw: unknown): OthelloMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;
    if (m.pass === true) return { pass: true, row: 0, col: 0 };
    if (typeof m.row !== "number" || typeof m.col !== "number") return null;
    if (!Number.isInteger(m.row) || !Number.isInteger(m.col)) return null;
    if (m.row < 0 || m.row >= 8 || m.col < 0 || m.col >= 8) return null;
    return { row: m.row, col: m.col };
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

  getLogEntries(prevState: OthelloState, newState: OthelloState): GameLogEntry[] {
    const playerId = prevState.playerIds[prevState.currentPlayerIndex]!;
    // playerIndex 0 = black, 1 = white
    const myColor: "black" | "white" = prevState.currentPlayerIndex === 0 ? "black" : "white";
    const oppColor: "black" | "white" = myColor === "black" ? "white" : "black";

    // ボードに変化がなければパス
    const boardChanged = prevState.board.some((row, r) =>
      row.some((cell, c) => cell !== newState.board[r]![c])
    );

    if (!boardChanged) {
      return [{ playerId, message: "パスしました", tag: "Pass", tagColor: "#6366f1" }];
    }

    // 置いた位置を特定（empty → myColor になったセル）、ひっくり返した数を数える
    let placedRow = -1;
    let placedCol = -1;
    let flippedCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const prev = prevState.board[r]![c]!;
        const next = newState.board[r]![c]!;
        if (prev === "empty" && next === myColor) {
          placedRow = r;
          placedCol = c;
        } else if (prev === oppColor && next === myColor) {
          flippedCount++;
        }
      }
    }

    const colLabel = String.fromCharCode(65 + placedCol); // A-H
    const rowLabel = String(placedRow + 1);               // 1-8
    const flipText = flippedCount > 0 ? `（${flippedCount}枚ひっくり返した）` : "";
    return [{ playerId, message: `${colLabel}${rowLabel} に石を置きました${flipText}` }];
  },
};
