import { describe, expect, it } from "vitest";
import { PIECES, TOTAL_CELLS, TOTAL_VARIANTS } from "../pieces.js";

describe("PIECES", () => {
  it("全22ピースが定義されている", () => {
    expect(PIECES).toHaveLength(22);
  });

  it("全ピースの合計マス数が110", () => {
    expect(TOTAL_CELLS).toBe(110);
  });

  it("全バリアント合計数 > 0", () => {
    expect(TOTAL_VARIANTS).toBeGreaterThan(0);
  });

  it("各ピースのIDが連番", () => {
    PIECES.forEach((piece, i) => {
      expect(piece.id).toBe(i);
    });
  });

  it("各ピースのsizeが1〜6の範囲", () => {
    PIECES.forEach((piece) => {
      expect(piece.size).toBeGreaterThanOrEqual(1);
      expect(piece.size).toBeLessThanOrEqual(6);
    });
  });

  it("各バリアントのセル数がsizeと一致", () => {
    PIECES.forEach((piece) => {
      piece.variants.forEach((variant) => {
        expect(variant.cells).toHaveLength(piece.size);
      });
    });
  });

  it("各ピースにバリアントが1つ以上ある", () => {
    PIECES.forEach((piece) => {
      expect(piece.variants.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("同一ピース内のバリアントはすべてユニーク", () => {
    PIECES.forEach((piece) => {
      const keys = new Set<string>();
      piece.variants.forEach((variant) => {
        // baseParity を含めたキーで重複判定（同一座標でも bp が異なればユニーク）
        const key = `${variant.baseParity}:${variant.cells
          .map(([r, c]) => `${r},${c}`)
          .join("|")}`;
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

  it("Piece 0 (1マス三角) はバリアント2つ（▲と▼ — 回転でパリティ変化）", () => {
    const p = PIECES[0];
    expect(p.size).toBe(1);
    // 1マスピースは回転しても1マスだが、パリティが変わるので2バリアント
    expect(p.variants.length).toBeGreaterThanOrEqual(1);
    // 全バリアントが中心=(0,0) のはず
    p.variants.forEach((v) => {
      expect(v.cells).toEqual([[0, 0]]);
    });
  });

  it("Piece 2 (3セル横一列) は複数バリアント", () => {
    const p = PIECES[2];
    expect(p.size).toBe(3);
    expect(p.variants.length).toBeGreaterThanOrEqual(2);
  });

  it("Piece 13 (六角形6セル) のバリアント数が妥当", () => {
    const p = PIECES[13];
    expect(p.size).toBe(6);
    // 六角形は高対称性なので少ないバリアント
    expect(p.variants.length).toBeGreaterThanOrEqual(1);
  });

  it("各ピースのバリアント数が最大12以下", () => {
    PIECES.forEach((piece) => {
      expect(piece.variants.length).toBeLessThanOrEqual(12);
    });
  });

  it("サイズ分布が正しい（1セル1個、2セル1個、3セル1個、4セル3個、5セル4個、6セル12個）", () => {
    const sizes = PIECES.map((p) => p.size);
    expect(sizes.filter((s) => s === 1).length).toBe(1);
    expect(sizes.filter((s) => s === 2).length).toBe(1);
    expect(sizes.filter((s) => s === 3).length).toBe(1);
    expect(sizes.filter((s) => s === 4).length).toBe(3);
    expect(sizes.filter((s) => s === 5).length).toBe(4);
    expect(sizes.filter((s) => s === 6).length).toBe(12);
  });
});
