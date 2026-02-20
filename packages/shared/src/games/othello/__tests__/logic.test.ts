import { describe, it, expect } from "vitest";
import {
  createBoard,
  getFlippedDiscs,
  isValidMove,
  getValidMoves,
  applyMoveToBoard,
  countDiscs,
} from "../logic.js";
import type { OthelloBoard } from "../types.js";

// 初期盤面:
//   3,3=white  3,4=black
//   4,3=black  4,4=white

describe("createBoard", () => {
  it("8x8のempty盤面を返す（初期4石を除く）", () => {
    const board = createBoard();
    expect(board).toHaveLength(8);
    board.forEach((row) => expect(row).toHaveLength(8));
  });

  it("初期4石が正しく配置される", () => {
    const board = createBoard();
    expect(board[3][3]).toBe("white");
    expect(board[3][4]).toBe("black");
    expect(board[4][3]).toBe("black");
    expect(board[4][4]).toBe("white");
  });

  it("初期4石以外はすべてempty", () => {
    const board = createBoard();
    let nonEmptyCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== "empty") nonEmptyCount++;
      }
    }
    expect(nonEmptyCount).toBe(4);
  });
});

describe("getFlippedDiscs", () => {
  it("初期盤面で(2,3)に黒を置くと(3,3)が反転する", () => {
    const board = createBoard();
    const flipped = getFlippedDiscs(board, 2, 3, 0); // playerIndex=0=black
    expect(flipped).toContainEqual([3, 3]);
    expect(flipped).toHaveLength(1);
  });

  it("初期盤面で(3,2)に黒を置くと(3,3)が反転する", () => {
    const board = createBoard();
    const flipped = getFlippedDiscs(board, 3, 2, 0);
    expect(flipped).toContainEqual([3, 3]);
    expect(flipped).toHaveLength(1);
  });

  it("占有済みマスに置いてもflippedは空", () => {
    const board = createBoard();
    const flipped = getFlippedDiscs(board, 3, 3, 0); // 既にwhiteがある
    expect(flipped).toHaveLength(0);
  });

  it("挟める石がないと空を返す", () => {
    const board = createBoard();
    // (0,0)は挟める石がない
    const flipped = getFlippedDiscs(board, 0, 0, 0);
    expect(flipped).toHaveLength(0);
  });

  it("複数方向に反転できる場合はすべて含む", () => {
    // 手動で複数方向に反転できるボードを作成
    const board: OthelloBoard = Array.from({ length: 8 }, () =>
      Array(8).fill("empty")
    );
    // 黒: (3,2), (3,4)  白: (3,3)
    board[3][2] = "black";
    board[3][3] = "white";
    board[3][4] = "black";
    // 白が(3,1)に置く: (3,2)の黒を反転
    // 白(playerIndex=1)が(3,1)に置く → 方向[0,1]で (3,2)=black → (3,3)=white ✗ (自分)なのでflip [3,2]のみ
    const flipped = getFlippedDiscs(board, 3, 1, 1); // playerIndex=1=white
    expect(flipped).toContainEqual([3, 2]);
  });
});

describe("isValidMove", () => {
  it("初期盤面でプレイヤー0(黒)の有効な手", () => {
    const board = createBoard();
    expect(isValidMove(board, 2, 3, 0)).toBe(true);
    expect(isValidMove(board, 3, 2, 0)).toBe(true);
    expect(isValidMove(board, 4, 5, 0)).toBe(true);
    expect(isValidMove(board, 5, 4, 0)).toBe(true);
  });

  it("初期盤面でプレイヤー0(黒)の無効な手（隅など）", () => {
    const board = createBoard();
    expect(isValidMove(board, 0, 0, 0)).toBe(false);
    expect(isValidMove(board, 3, 3, 0)).toBe(false); // 占有済み
    expect(isValidMove(board, 3, 4, 0)).toBe(false); // 占有済み
  });

  it("初期盤面でプレイヤー1(白)の有効な手", () => {
    const board = createBoard();
    expect(isValidMove(board, 2, 4, 1)).toBe(true);
    expect(isValidMove(board, 3, 5, 1)).toBe(true);
    expect(isValidMove(board, 4, 2, 1)).toBe(true);
    expect(isValidMove(board, 5, 3, 1)).toBe(true);
  });
});

describe("getValidMoves", () => {
  it("初期盤面でプレイヤー0(黒)に4つの有効手", () => {
    const board = createBoard();
    const moves = getValidMoves(board, 0);
    expect(moves).toHaveLength(4);
  });

  it("初期盤面でプレイヤー1(白)に4つの有効手", () => {
    const board = createBoard();
    const moves = getValidMoves(board, 1);
    expect(moves).toHaveLength(4);
  });

  it("有効手なしの場合は空配列", () => {
    // 全マスを黒で埋める → 白には有効手なし
    const board: OthelloBoard = Array.from({ length: 8 }, () =>
      Array(8).fill("black")
    );
    const moves = getValidMoves(board, 1); // 白
    expect(moves).toHaveLength(0);
  });
});

describe("applyMoveToBoard", () => {
  it("(2,3)に黒を置くと(3,3)が黒に変わる", () => {
    const board = createBoard();
    const newBoard = applyMoveToBoard(board, 2, 3, 0);
    expect(newBoard[2][3]).toBe("black");
    expect(newBoard[3][3]).toBe("black"); // 反転
    expect(newBoard[3][4]).toBe("black"); // 変わらず
    expect(newBoard[4][3]).toBe("black"); // 変わらず
    expect(newBoard[4][4]).toBe("white"); // 変わらず
  });

  it("元の盤面を変更しない（不変性）", () => {
    const board = createBoard();
    const original = board[3][3];
    applyMoveToBoard(board, 2, 3, 0);
    expect(board[3][3]).toBe(original); // 元の盤面は変わらない
  });
});

describe("countDiscs", () => {
  it("初期盤面でblack=2, white=2", () => {
    const board = createBoard();
    const { black, white } = countDiscs(board);
    expect(black).toBe(2);
    expect(white).toBe(2);
  });

  it("全emptyボードでblack=0, white=0", () => {
    const board: OthelloBoard = Array.from({ length: 8 }, () =>
      Array(8).fill("empty")
    );
    const { black, white } = countDiscs(board);
    expect(black).toBe(0);
    expect(white).toBe(0);
  });

  it("全黒ボードでblack=64, white=0", () => {
    const board: OthelloBoard = Array.from({ length: 8 }, () =>
      Array(8).fill("black")
    );
    const { black, white } = countDiscs(board);
    expect(black).toBe(64);
    expect(white).toBe(0);
  });
});
