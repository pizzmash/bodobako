import { describe, expect, it } from "vitest";
import {
  BOARD_MASK,
  LEFT_COL_MASK,
  RIGHT_COL_MASK,
  bitPositions,
  bitToCoords,
  cornerBitFor,
  getCornerAdjacent,
  getEdgeAdjacent,
  pieceToBitboard,
  popcount,
  toBigInt,
  toHex,
} from "../bitboard.js";
import { BOARD_SIZE } from "../types.js";

describe("toBigInt / toHex", () => {
  it("'0' → 0n → '0'", () => {
    expect(toBigInt("0")).toBe(0n);
    expect(toHex(0n)).toBe("0");
  });

  it("往復変換が一致する", () => {
    const hex = "1a3f";
    expect(toHex(toBigInt(hex))).toBe(hex);
  });

  it("大きな値でも正しく変換できる", () => {
    const val = (1n << 399n) | 1n;
    const hex = toHex(val);
    expect(toBigInt(hex)).toBe(val);
  });
});

describe("BOARD_MASK", () => {
  it("400ビットの全1マスク", () => {
    expect(popcount(BOARD_MASK)).toBe(400);
    // 401ビット目は立っていない
    expect(BOARD_MASK >> 400n).toBe(0n);
  });
});

describe("LEFT_COL_MASK / RIGHT_COL_MASK", () => {
  it("LEFT_COL_MASK は col=0 の20ビット", () => {
    expect(popcount(LEFT_COL_MASK)).toBe(20);
    const positions = bitPositions(LEFT_COL_MASK);
    positions.forEach((pos) => {
      expect(pos % BOARD_SIZE).toBe(0);
    });
  });

  it("RIGHT_COL_MASK は col=19 の20ビット", () => {
    expect(popcount(RIGHT_COL_MASK)).toBe(20);
    const positions = bitPositions(RIGHT_COL_MASK);
    positions.forEach((pos) => {
      expect(pos % BOARD_SIZE).toBe(19);
    });
  });

  it("LEFT_COL_MASK と RIGHT_COL_MASK は重ならない", () => {
    expect(LEFT_COL_MASK & RIGHT_COL_MASK).toBe(0n);
  });
});

describe("cornerBitFor", () => {
  it("色0 = 左上 (0,0) → bit 0", () => {
    expect(cornerBitFor(0)).toBe(1n);
  });

  it("色1 = 右上 (0,19) → bit 19", () => {
    expect(cornerBitFor(1)).toBe(1n << 19n);
  });

  it("色2 = 右下 (19,19) → bit 399", () => {
    expect(cornerBitFor(2)).toBe(1n << 399n);
  });

  it("色3 = 左下 (19,0) → bit 380", () => {
    expect(cornerBitFor(3)).toBe(1n << 380n);
  });
});

describe("pieceToBitboard", () => {
  it("1マスピースを (0,0) に配置 → bit 0", () => {
    const bb = pieceToBitboard([[0, 0]], 0, 0);
    expect(bb).toBe(1n);
  });

  it("2マス横ピースを (0,0) に配置 → bit 0 | bit 1", () => {
    const bb = pieceToBitboard([[0, 0], [0, 1]], 0, 0);
    expect(bb).toBe(0b11n);
  });

  it("盤面外にはみ出す場合は null を返す", () => {
    // (0,0) 中心で左に1マスはみ出す
    expect(pieceToBitboard([[0, -1]], 0, 0)).toBeNull();
    // (19,19) 中心で右に1マスはみ出す
    expect(pieceToBitboard([[0, 1]], 19, 19)).toBeNull();
    // (0,0) 中心で上にはみ出す
    expect(pieceToBitboard([[-1, 0]], 0, 0)).toBeNull();
    // (19,19) 中心で下にはみ出す
    expect(pieceToBitboard([[1, 0]], 19, 19)).toBeNull();
  });

  it("盤面端でも範囲内なら正常にビットボード生成", () => {
    // 右下角 (19,19) に1マス
    const bb = pieceToBitboard([[0, 0]], 19, 19);
    expect(bb).toBe(1n << 399n);
  });
});

describe("getEdgeAdjacent", () => {
  it("(0,0) の辺隣接は右と下の2セル", () => {
    const bb = 1n; // bit 0 = (0,0)
    const adj = getEdgeAdjacent(bb);
    const coords = bitToCoords(adj);
    expect(coords).toEqual(
      expect.arrayContaining([[0, 1], [1, 0]]),
    );
    expect(coords).toHaveLength(2);
  });

  it("中央セル (10,10) の辺隣接は上下左右の4セル", () => {
    const pos = 10 * BOARD_SIZE + 10;
    const bb = 1n << BigInt(pos);
    const adj = getEdgeAdjacent(bb);
    expect(popcount(adj)).toBe(4);
    const coords = bitToCoords(adj);
    expect(coords).toEqual(
      expect.arrayContaining([
        [9, 10], [11, 10], [10, 9], [10, 11],
      ]),
    );
  });

  it("右端 (5,19) からのラップアラウンドが発生しない", () => {
    const pos = 5 * BOARD_SIZE + 19;
    const bb = 1n << BigInt(pos);
    const adj = getEdgeAdjacent(bb);
    const coords = bitToCoords(adj);
    // (5,19) の隣接: 上(4,19), 下(6,19), 左(5,18) のみ（右はない）
    expect(coords).toEqual(
      expect.arrayContaining([[4, 19], [6, 19], [5, 18]]),
    );
    expect(coords).toHaveLength(3);
  });

  it("左端 (5,0) からのラップアラウンドが発生しない", () => {
    const pos = 5 * BOARD_SIZE;
    const bb = 1n << BigInt(pos);
    const adj = getEdgeAdjacent(bb);
    const coords = bitToCoords(adj);
    // (5,0) の隣接: 上(4,0), 下(6,0), 右(5,1) のみ
    expect(coords).toEqual(
      expect.arrayContaining([[4, 0], [6, 0], [5, 1]]),
    );
    expect(coords).toHaveLength(3);
  });
});

describe("getCornerAdjacent", () => {
  it("(0,0) の角隣接は (1,1) のみ", () => {
    const bb = 1n;
    const adj = getCornerAdjacent(bb);
    const coords = bitToCoords(adj);
    expect(coords).toEqual([[1, 1]]);
  });

  it("中央セル (10,10) の角隣接は4セル", () => {
    const pos = 10 * BOARD_SIZE + 10;
    const bb = 1n << BigInt(pos);
    const adj = getCornerAdjacent(bb);
    expect(popcount(adj)).toBe(4);
    const coords = bitToCoords(adj);
    expect(coords).toEqual(
      expect.arrayContaining([
        [9, 9], [9, 11], [11, 9], [11, 11],
      ]),
    );
  });

  it("右端 (5,19) の角隣接にラップアラウンドが発生しない", () => {
    const pos = 5 * BOARD_SIZE + 19;
    const bb = 1n << BigInt(pos);
    const adj = getCornerAdjacent(bb);
    const coords = bitToCoords(adj);
    // (4,18), (6,18) のみ（右側は盤面外）
    expect(coords).toEqual(
      expect.arrayContaining([[4, 18], [6, 18]]),
    );
    expect(coords).toHaveLength(2);
  });

  it("左端 (5,0) の角隣接にラップアラウンドが発生しない", () => {
    const pos = 5 * BOARD_SIZE;
    const bb = 1n << BigInt(pos);
    const adj = getCornerAdjacent(bb);
    const coords = bitToCoords(adj);
    // (4,1), (6,1) のみ（左側は盤面外）
    expect(coords).toEqual(
      expect.arrayContaining([[4, 1], [6, 1]]),
    );
    expect(coords).toHaveLength(2);
  });

  it("右下角 (19,19) の角隣接は (18,18) のみ", () => {
    const bb = 1n << 399n;
    const adj = getCornerAdjacent(bb);
    const coords = bitToCoords(adj);
    expect(coords).toEqual([[18, 18]]);
  });
});

describe("popcount", () => {
  it("0n → 0", () => {
    expect(popcount(0n)).toBe(0);
  });

  it("1ビット → 1", () => {
    expect(popcount(1n << 200n)).toBe(1);
  });

  it("全ビット → 400", () => {
    expect(popcount(BOARD_MASK)).toBe(400);
  });
});

describe("bitPositions", () => {
  it("空ビットボード → 空配列", () => {
    expect(bitPositions(0n)).toEqual([]);
  });

  it("正しいビット位置を列挙する", () => {
    const bb = (1n << 5n) | (1n << 100n) | (1n << 399n);
    expect(bitPositions(bb)).toEqual([5, 100, 399]);
  });
});

describe("bitToCoords", () => {
  it("ビット位置を (row, col) に正しく変換する", () => {
    // bit 0 = (0,0), bit 21 = (1,1), bit 399 = (19,19)
    const bb = 1n | (1n << 21n) | (1n << 399n);
    const coords = bitToCoords(bb);
    expect(coords).toEqual(
      expect.arrayContaining([[0, 0], [1, 1], [19, 19]]),
    );
    expect(coords).toHaveLength(3);
  });
});
