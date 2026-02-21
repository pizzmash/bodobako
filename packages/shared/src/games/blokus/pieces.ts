// ---------------------------------------------------------------------------
// ブロックス — 21ピース定義 & バリアント生成
// ---------------------------------------------------------------------------
// 各ピースは「正規形のセル座標」と「中心座標」で定義し、
// 回転(4)×反転(2)=最大8パターンからユニーク版を自動生成する。
// ---------------------------------------------------------------------------

import type { PieceDefinition, PieceVariant } from "./types.js";

// ---------------------------------------------------------------------------
// 正規形定義
// ---------------------------------------------------------------------------

interface RawPiece {
  cells: [number, number][];
}

/**
 * ピースの正規形。blocks.md のピース一覧に対応。
 *
 * 表記凡例:
 *   x = セル, o = 空き
 *   座標は [row, col]（左上原点）
 */
const RAW_PIECES: RawPiece[] = [
  // 0: Piece 1 — 1マス
  // x
  { cells: [[0,0]] },

  // 1: Piece 2 — 2マス
  // xx
  { cells: [[0,0],[0,1]] },

  // 2: Piece 3 — L-トロミノ
  // ox
  // xx
  { cells: [[0,1],[1,0],[1,1]] },

  // 3: Piece 4 — I-トロミノ
  // xxx
  { cells: [[0,0],[0,1],[0,2]] },

  // 4: Piece 5 — S-テトロミノ
  // ox
  // xx
  // xo
  { cells: [[0,1],[1,0],[1,1],[2,0]] },

  // 5: Piece 6 — O-テトロミノ
  // xx
  // xx
  { cells: [[0,0],[0,1],[1,0],[1,1]] },

  // 6: Piece 7 — T-テトロミノ
  // oxo
  // xxx
  { cells: [[0,1],[1,0],[1,1],[1,2]] },

  // 7: Piece 8 — L-テトロミノ
  // xxx
  // oox
  { cells: [[0,0],[0,1],[0,2],[1,2]] },

  // 8: Piece 9 — I-テトロミノ
  // xxxx
  { cells: [[0,0],[0,1],[0,2],[0,3]] },

  // 9: Piece 10 — P-ペントミノ
  // ox
  // xx
  // xx
  { cells: [[0,1],[1,0],[1,1],[2,0],[2,1]] },

  // 10: Piece 11 — U-ペントミノ
  // xx
  // xo
  // xx
  { cells: [[0,0],[0,1],[1,0],[2,0],[2,1]] },

  // 11: Piece 12 — T変形ペントミノ
  // oox
  // xxx
  // oox
  { cells: [[0,2],[1,0],[1,1],[1,2],[2,2]] },

  // 12: Piece 13 — N-ペントミノ
  // ox
  // ox
  // xx
  // xo
  { cells: [[0,1],[1,1],[2,0],[2,1],[3,0]] },

  // 13: Piece 14 — Z-ペントミノ
  // oxx
  // oxo
  // xxo
  { cells: [[0,1],[0,2],[1,1],[2,0],[2,1]] },

  // 14: Piece 15 — F-ペントミノ
  // oxo
  // oxx
  // xxo
  { cells: [[0,1],[1,1],[1,2],[2,0],[2,1]] },

  // 15: Piece 16 — L-ペントミノ
  // xxxx
  // ooox
  { cells: [[0,0],[0,1],[0,2],[0,3],[1,3]] },

  // 16: Piece 17 — W-ペントミノ
  // oxx
  // xxo
  // xoo
  { cells: [[0,1],[0,2],[1,0],[1,1],[2,0]] },

  // 17: Piece 18 — X-ペントミノ（プラス）
  // oxo
  // xxx
  // oxo
  { cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },

  // 18: Piece 19 — I-ペントミノ
  // xxxxx
  { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },

  // 19: Piece 20 — V-ペントミノ
  // oox
  // oox
  // xxx
  { cells: [[0,2],[1,2],[2,0],[2,1],[2,2]] },

  // 20: Piece 21 — Y-ペントミノ
  // oxoo
  // xxxx
  { cells: [[0,1],[1,0],[1,1],[1,2],[1,3]] },
];

// ---------------------------------------------------------------------------
// 変換ユーティリティ
// ---------------------------------------------------------------------------

/** 90°時計回り回転: (r, c) → (c, -r) */
function rotate90CW(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [c, -r]);
}

/** 水平反転: (r, c) → (r, -c) */
function flipH(cells: [number, number][]): [number, number][] {
  return cells.map(([r, c]) => [r, -c]);
}

/** min(row)=0, min(col)=0 に平行移動してソート */
function normalizePosition(cells: [number, number][]): [number, number][] {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minR, c - minC] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** 正規化済みセル配列を一意キー文字列に変換 */
function cellsToKey(sortedCells: [number, number][]): string {
  return sortedCells.map(([r, c]) => `${r},${c}`).join("|");
}

/**
 * セル群の重心に最も近いセルを中心として選択。
 * 同距離の場合は (row, col) 辞書順で最小のセルを選ぶ。
 */
function computeCenter(cells: [number, number][]): [number, number] {
  const n = cells.length;
  const cr = cells.reduce((s, [r]) => s + r, 0) / n;
  const cc = cells.reduce((s, [, c]) => s + c, 0) / n;

  let best = cells[0];
  let bestDist = Infinity;
  for (const cell of cells) {
    const d = (cell[0] - cr) ** 2 + (cell[1] - cc) ** 2;
    if (
      d < bestDist ||
      (d === bestDist &&
        (cell[0] < best[0] || (cell[0] === best[0] && cell[1] < best[1])))
    ) {
      bestDist = d;
      best = cell;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// バリアント生成
// ---------------------------------------------------------------------------

/**
 * 回転(4)×反転(2)=最大8パターンの変換を適用し、
 * 正規化した絶対座標形状で重複排除してユニークバリアントを生成する。
 * 各バリアントの center は重心最寄りセルから自動計算。
 */
function generateVariants(raw: RawPiece): PieceVariant[] {
  const seen = new Set<string>();
  const variants: PieceVariant[] = [];

  let current = raw.cells;
  for (let rot = 0; rot < 4; rot++) {
    for (const transformed of [current, flipH(current)]) {
      // 絶対座標を min=(0,0) に正規化して形状比較
      const normalized = normalizePosition(transformed);
      const key = cellsToKey(normalized);
      if (seen.has(key)) continue;
      seen.add(key);

      // 重心最寄りセルを中心に選択
      const center = computeCenter(normalized);
      // 中心相対座標に変換（normalized はソート済み→減算後もソート順維持）
      const relative = normalized.map(
        ([r, c]) => [r - center[0], c - center[1]] as readonly [number, number],
      );
      variants.push({ cells: relative });
    }
    current = rotate90CW(current);
  }

  return variants;
}

// ---------------------------------------------------------------------------
// PIECES 定数 — モジュールロード時に1回だけ生成
// ---------------------------------------------------------------------------

function buildPieces(): readonly PieceDefinition[] {
  return RAW_PIECES.map((raw, id) => ({
    id,
    size: raw.cells.length,
    variants: generateVariants(raw),
  }));
}

/** 全21ピースの定義（バリアント含む） */
export const PIECES: readonly PieceDefinition[] = buildPieces();

/** 全ピースの全バリアント合計数（標準ブロックス = 91） */
export const TOTAL_VARIANTS = PIECES.reduce((sum, p) => sum + p.variants.length, 0);
