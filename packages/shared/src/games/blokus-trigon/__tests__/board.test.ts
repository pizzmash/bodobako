import { describe, expect, it } from "vitest";
import {
    BORDER_MASK,
    DOWN_MASK,
    ROW_RANGES,
    UP_MASK,
    VALID_MASK,
    bitPositions,
    bitToCoords,
    getCornerAdjacent,
    getEdgeAdjacent,
    isUpTriangle,
    isValidCell,
    pieceToBitboard,
    popcount,
    startBitFor,
    toBigInt,
    toHex
} from "../board.js";
import { GRID_COLS, GRID_ROWS, START_POSITIONS } from "../types.js";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function cellBit(row: number, col: number): bigint {
  return 1n << BigInt(row * GRID_COLS + col);
}

// ---------------------------------------------------------------------------
// 定数テスト
// ---------------------------------------------------------------------------

describe("定数", () => {
  it("VALID_MASK のポップカウントが486", () => {
    expect(popcount(VALID_MASK)).toBe(486);
  });

  it("VALID_MASK の各行のセル数が正しい", () => {
    // 上半分: 19,21,23,25,27,29,31,33,35
    // 下半分: 35,33,31,29,27,25,23,21,19
    const expected = [19, 21, 23, 25, 27, 29, 31, 33, 35, 35, 33, 31, 29, 27, 25, 23, 21, 19];
    for (let r = 0; r < GRID_ROWS; r++) {
      let count = 0;
      for (let c = 0; c < GRID_COLS; c++) {
        if ((VALID_MASK & cellBit(r, c)) !== 0n) count++;
      }
      expect(count).toBe(expected[r]);
    }
  });

  it("BORDER_MASK ⊂ VALID_MASK", () => {
    expect((BORDER_MASK & VALID_MASK)).toBe(BORDER_MASK);
  });

  it("BORDER_MASK のポップカウント > 0", () => {
    expect(popcount(BORDER_MASK)).toBeGreaterThan(0);
  });

  it("UP_MASK と DOWN_MASK が VALID_MASK を分割する", () => {
    expect(UP_MASK | DOWN_MASK).toBe(VALID_MASK);
    expect(UP_MASK & DOWN_MASK).toBe(0n);
  });

  it("GRID_COLS = 35", () => {
    expect(GRID_COLS).toBe(35);
  });

  it("ROW_RANGES の行数 = GRID_ROWS", () => {
    expect(ROW_RANGES.length).toBe(GRID_ROWS);
  });
});

// ---------------------------------------------------------------------------
// toBigInt / toHex
// ---------------------------------------------------------------------------

describe("toBigInt / toHex", () => {
  it("'0' → 0n", () => {
    expect(toBigInt("0")).toBe(0n);
  });

  it("往復変換", () => {
    const val = 123456789012345678901234n;
    expect(toBigInt(toHex(val))).toBe(val);
  });
});

// ---------------------------------------------------------------------------
// pieceToBitboard
// ---------------------------------------------------------------------------

describe("pieceToBitboard", () => {
  it("有効位置での変換", () => {
    // row=8, col=17 は VALID_MASK 内（中央付近）
    const bb = pieceToBitboard([[0, 0], [0, 1]], 8, 17);
    expect(bb).not.toBeNull();
    expect(popcount(bb!)).toBe(2);
  });

  it("VALID_MASK 外にはみ出す場合 → null", () => {
    // row=0, col=0 は VALID_MASK 外
    const bb = pieceToBitboard([[0, 0]], 0, 0);
    expect(bb).toBeNull();
  });

  it("グリッド外にはみ出す場合 → null", () => {
    const bb = pieceToBitboard([[0, 0]], -1, 0);
    expect(bb).toBeNull();
    const bb2 = pieceToBitboard([[0, 0]], 0, 35);
    expect(bb2).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isUpTriangle
// ---------------------------------------------------------------------------

describe("isUpTriangle", () => {
  it("(0,8) → ▲ (偶数)", () => {
    expect(isUpTriangle(0, 8)).toBe(true);
  });

  it("(0,9) → ▼ (奇数)", () => {
    expect(isUpTriangle(0, 9)).toBe(false);
  });

  it("(9,0) → ▼", () => {
    expect(isUpTriangle(9, 0)).toBe(false);
  });

  it("(9,1) → ▲", () => {
    expect(isUpTriangle(9, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getEdgeAdjacent
// ---------------------------------------------------------------------------

describe("getEdgeAdjacent", () => {
  it("▲セルの辺隣接 = 左、右、下", () => {
    // (8, 10) → (8+10)%2=0 → ▲
    const bb = cellBit(8, 10);
    const edge = getEdgeAdjacent(bb);
    // 左: (8,9), 右: (8,11), 下: (9,10)
    expect((edge & cellBit(8, 9)) !== 0n).toBe(true);
    expect((edge & cellBit(8, 11)) !== 0n).toBe(true);
    expect((edge & cellBit(9, 10)) !== 0n).toBe(true);
    // 上は辺隣接ではない
    expect((edge & cellBit(7, 10)) !== 0n).toBe(false);
    // 全部で3セル以下
    expect(popcount(edge)).toBeLessThanOrEqual(3);
  });

  it("▼セルの辺隣接 = 左、右、上", () => {
    // (8, 11) → (8+11)%2=1 → ▼
    const bb = cellBit(8, 11);
    const edge = getEdgeAdjacent(bb);
    // 左: (8,10), 右: (8,12), 上: (7,11)
    expect((edge & cellBit(8, 10)) !== 0n).toBe(true);
    expect((edge & cellBit(8, 12)) !== 0n).toBe(true);
    expect((edge & cellBit(7, 11)) !== 0n).toBe(true);
    expect(popcount(edge)).toBeLessThanOrEqual(3);
  });

  it("左端セルの左隣は存在しない", () => {
    // row 8, col 0 → 左端 (▲)
    const bb = cellBit(8, 0);
    const edge = getEdgeAdjacent(bb);
    // col=-1 は存在しない
    // 右: (8,1), 下: (9,0) のみ
    expect(popcount(edge)).toBe(2);
  });

  it("VALID_MASK 外のセルは返さない", () => {
    const bb = cellBit(8, 0);
    const edge = getEdgeAdjacent(bb);
    expect((edge & ~VALID_MASK)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// getCornerAdjacent
// ---------------------------------------------------------------------------

describe("getCornerAdjacent", () => {
  it("▲セルの角隣接", () => {
    // (8, 10) → ▲
    const bb = cellBit(8, 10);
    const corner = getCornerAdjacent(bb);
    // 上左(7,9), 上右(7,11), 下左遠(9,8), 下右遠(9,12)
    expect((corner & cellBit(7, 9)) !== 0n).toBe(true);
    expect((corner & cellBit(7, 11)) !== 0n).toBe(true);
    expect((corner & cellBit(9, 8)) !== 0n).toBe(true);
    expect((corner & cellBit(9, 12)) !== 0n).toBe(true);
  });

  it("▼セルの角隣接", () => {
    // (8, 11) → ▼
    const bb = cellBit(8, 11);
    const corner = getCornerAdjacent(bb);
    // 下左(9,10), 下右(9,12), 上左遠(7,9), 上右遠(7,13)
    expect((corner & cellBit(9, 10)) !== 0n).toBe(true);
    expect((corner & cellBit(9, 12)) !== 0n).toBe(true);
    expect((corner & cellBit(7, 9)) !== 0n).toBe(true);
    expect((corner & cellBit(7, 13)) !== 0n).toBe(true);
  });

  it("辺隣接と角隣接に重複がない", () => {
    const bb = cellBit(8, 10);
    const edge = getEdgeAdjacent(bb);
    const corner = getCornerAdjacent(bb);
    expect((edge & corner)).toBe(0n);
  });

  it("結果は VALID_MASK 内のみ", () => {
    const bb = cellBit(0, 8); // 最上行左端
    const corner = getCornerAdjacent(bb);
    expect((corner & ~VALID_MASK)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// popcount / bitPositions / bitToCoords
// ---------------------------------------------------------------------------

describe("ユーティリティ", () => {
  it("popcount", () => {
    expect(popcount(0n)).toBe(0);
    expect(popcount(0b1010101n)).toBe(4);
  });

  it("bitPositions", () => {
    expect(bitPositions(0b1010n)).toEqual([1, 3]);
  });

  it("bitToCoords", () => {
    const bb = cellBit(3, 17);
    const coords = bitToCoords(bb);
    expect(coords).toEqual([[3, 17]]);
  });
});

// ---------------------------------------------------------------------------
// スタート位置
// ---------------------------------------------------------------------------

describe("スタート位置", () => {
  it("6箇所すべてが VALID_MASK 内", () => {
    for (let i = 0; i < START_POSITIONS.length; i++) {
      const [r, c] = START_POSITIONS[i];
      expect(isValidCell(r, c)).toBe(true);
      expect((VALID_MASK & cellBit(r, c)) !== 0n).toBe(true);
    }
  });

  it("各スタート位置のパリティ", () => {
    // 色0: (3,17) → ▲, 色1: (6,9) → ▼, 色2: (6,25) → ▼
    // 色3: (14,17) → ▼, 色4: (11,25) → ▲, 色5: (11,9) → ▲
    expect(isUpTriangle(3, 17)).toBe(true);
    expect(isUpTriangle(6, 9)).toBe(false);
    expect(isUpTriangle(6, 25)).toBe(false);
    expect(isUpTriangle(14, 17)).toBe(false);
    expect(isUpTriangle(11, 25)).toBe(true);
    expect(isUpTriangle(11, 9)).toBe(true);
  });

  it("startBitFor が正しいビットを返す", () => {
    for (let i = 0; i < START_POSITIONS.length; i++) {
      const [r, c] = START_POSITIONS[i];
      expect(startBitFor(i)).toBe(cellBit(r, c));
    }
  });
});
