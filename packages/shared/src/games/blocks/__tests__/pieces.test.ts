import { describe, expect, it } from "vitest";
import { PIECES, TOTAL_VARIANTS } from "../pieces.js";

describe("PIECES", () => {
  it("全21ピースが定義されている", () => {
    expect(PIECES).toHaveLength(21);
  });

  it("全ピースの合計マス数が89（公式値）", () => {
    const totalSize = PIECES.reduce((sum, p) => sum + p.size, 0);
    expect(totalSize).toBe(89);
  });

  it("全バリアント合計が91（公式値）", () => {
    expect(TOTAL_VARIANTS).toBe(91);
  });

  it("各ピースのIDが連番", () => {
    PIECES.forEach((piece, i) => {
      expect(piece.id).toBe(i);
    });
  });

  it("各ピースのsizeが1〜5の範囲", () => {
    PIECES.forEach((piece) => {
      expect(piece.size).toBeGreaterThanOrEqual(1);
      expect(piece.size).toBeLessThanOrEqual(5);
    });
  });

  it("各バリアントのセル数がsizeと一致", () => {
    PIECES.forEach((piece) => {
      piece.variants.forEach((variant, vi) => {
        expect(variant.cells).toHaveLength(piece.size);
      });
    });
  });

  it("各ピースのバリアント数が期待値と一致", () => {
    // https://en.wikipedia.org/wiki/Blokus - 標準的なバリアント数
    const expectedVariants = [
      1,  // piece 0: monomino
      2,  // piece 1: domino
      4,  // piece 2: L-tromino
      2,  // piece 3: I-tromino
      4,  // piece 4: S-tetromino
      1,  // piece 5: O-tetromino
      4,  // piece 6: T-tetromino
      8,  // piece 7: L-tetromino
      2,  // piece 8: I-tetromino
      8,  // piece 9: P-pentomino
      4,  // piece 10: U-pentomino
      4,  // piece 11: T-variant pentomino
      8,  // piece 12: N-pentomino
      4,  // piece 13: Z-pentomino
      8,  // piece 14: F-pentomino
      8,  // piece 15: L-pentomino
      4,  // piece 16: W-pentomino
      1,  // piece 17: X-pentomino
      2,  // piece 18: I-pentomino
      4,  // piece 19: V-pentomino
      8,  // piece 20: Y-pentomino
    ];
    PIECES.forEach((piece, i) => {
      expect(piece.variants.length).toBe(expectedVariants[i]);
    });
  });

  it("同一ピース内のバリアントはすべてユニーク", () => {
    PIECES.forEach((piece) => {
      const keys = new Set<string>();
      piece.variants.forEach((variant) => {
        const key = variant.cells
          .map(([r, c]) => `${r},${c}`)
          .join("|");
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      });
    });
  });

  it("各バリアントのセルは (dr, dc) 辞書順にソートされている", () => {
    PIECES.forEach((piece) => {
      piece.variants.forEach((variant) => {
        for (let i = 1; i < variant.cells.length; i++) {
          const prev = variant.cells[i - 1];
          const curr = variant.cells[i];
          const sorted =
            prev[0] < curr[0] ||
            (prev[0] === curr[0] && prev[1] < curr[1]);
          expect(sorted).toBe(true);
        }
      });
    });
  });

  it("Piece 0 (monomino) はバリアント1つで中心=(0,0)", () => {
    const p = PIECES[0];
    expect(p.variants).toHaveLength(1);
    expect(p.variants[0].cells).toEqual([[0, 0]]);
  });

  it("Piece 17 (X-pentomino/プラス) はバリアント1つ（全方向対称）", () => {
    const p = PIECES[17];
    expect(p.variants).toHaveLength(1);
    // プラス形: 中心 + 上下左右
    const cells = p.variants[0].cells;
    expect(cells).toHaveLength(5);
    // (0,0) が含まれるはず（中心）
    expect(cells.some(([r, c]) => r === 0 && c === 0)).toBe(true);
  });

  it("Piece 5 (O-tetromino/正方形) はバリアント1つ（全方向対称）", () => {
    const p = PIECES[5];
    expect(p.variants).toHaveLength(1);
  });
});
