export type CellState = "empty" | "black" | "white";

export type OthelloBoard = CellState[][];

export interface OthelloState {
  board: OthelloBoard;
  currentPlayerIndex: number;
  playerIds: string[];
  passCount: number;
  finished: boolean;
}

export interface OthelloMove {
  row: number;
  col: number;
  pass?: boolean;
}

export const BOARD_SIZE = 8;

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;
