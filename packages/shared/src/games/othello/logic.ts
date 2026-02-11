import {
  type CellState,
  type OthelloBoard,
  type OthelloState,
  type OthelloMove,
  BOARD_SIZE,
  DIRECTIONS,
} from "./types.js";

export function createBoard(): OthelloBoard {
  const board: OthelloBoard = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => "empty" as CellState)
  );
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = "white";
  board[mid - 1][mid] = "black";
  board[mid][mid - 1] = "black";
  board[mid][mid] = "white";
  return board;
}

function getPlayerColor(playerIndex: number): CellState {
  return playerIndex === 0 ? "black" : "white";
}

function getOpponentColor(playerIndex: number): CellState {
  return playerIndex === 0 ? "white" : "black";
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getFlippedDiscs(
  board: OthelloBoard,
  row: number,
  col: number,
  playerIndex: number
): [number, number][] {
  if (board[row][col] !== "empty") return [];

  const myColor = getPlayerColor(playerIndex);
  const oppColor = getOpponentColor(playerIndex);
  const allFlipped: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const flipped: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;

    while (inBounds(r, c) && board[r][c] === oppColor) {
      flipped.push([r, c]);
      r += dr;
      c += dc;
    }

    if (flipped.length > 0 && inBounds(r, c) && board[r][c] === myColor) {
      allFlipped.push(...flipped);
    }
  }

  return allFlipped;
}

export function isValidMove(
  board: OthelloBoard,
  row: number,
  col: number,
  playerIndex: number
): boolean {
  return getFlippedDiscs(board, row, col, playerIndex).length > 0;
}

export function getValidMoves(
  board: OthelloBoard,
  playerIndex: number
): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isValidMove(board, r, c, playerIndex)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

export function applyMoveToBoard(
  board: OthelloBoard,
  row: number,
  col: number,
  playerIndex: number
): OthelloBoard {
  const newBoard = board.map((r) => [...r]);
  const flipped = getFlippedDiscs(board, row, col, playerIndex);
  const color = getPlayerColor(playerIndex);

  newBoard[row][col] = color;
  for (const [r, c] of flipped) {
    newBoard[r][c] = color;
  }

  return newBoard;
}

export function countDiscs(board: OthelloBoard): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === "black") black++;
      else if (board[r][c] === "white") white++;
    }
  }
  return { black, white };
}
