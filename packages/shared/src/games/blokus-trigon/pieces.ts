// ---------------------------------------------------------------------------
// ブロックストライゴン — 22ピース定義 & バリアント生成
// ---------------------------------------------------------------------------
// 三角グリッド上のピースを定義する。
// 各ピースは「正規形のセル座標 (row, col)」と baseParity で定義。
//
// baseParity: ピースを盤面に配置する際、配置先 (R, C) の
//   (R + C) % 2 が baseParity と一致する必要がある。
//   pieces.md の最初のセル記号から算出:
//     baseParity = intended_orientation XOR (row + col) % 2
//   (intended は ▲=0, ▼=1)
//
// 60°回転(6パターン) × 反転(2) = 最大12バリアントから
// ユニーク版を自動生成する（baseParity も追跡）。
// ---------------------------------------------------------------------------

import type { PieceDefinition, PieceVariant } from "./types.js";

// ---------------------------------------------------------------------------
// 正規形定義
// ---------------------------------------------------------------------------

interface RawPiece {
  cells: [number, number][];
  /** pieces.md の最初のセル記号から算出した基準パリティ */
  baseParity: 0 | 1;
}

/**
 * pieces.md のASCIIアートから変換した22ピースの座標配列。
 * 座標は (row, col) 左上原点。
 *
 * baseParity の算出: pieces.md の最初のセルの向き (▲=0, ▼=1) と
 * そのセルの (row+col)%2 の XOR。
 */
const RAW_PIECES: RawPiece[] = [
  // #1: ▲
  { cells: [[0, 0]], baseParity: 0 },

  // #2: ▲▼
  { cells: [[0, 0], [0, 1]], baseParity: 0 },

  // #3: ▲▼▲
  { cells: [[0, 0], [0, 1], [0, 2]], baseParity: 0 },

  // #4: ▲▼▲▼
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], baseParity: 0 },

  // #5: x▲x / ▲▼▲  — (0,1)=▲, 0 XOR 1 = 1
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2]], baseParity: 1 },

  // #6: xx▲ / ▼▲▼  — (0,2)=▲, 0 XOR 0 = 0
  { cells: [[0, 2], [1, 0], [1, 1], [1, 2]], baseParity: 0 },

  // #7: ▲▼▲▼▲
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], baseParity: 0 },

  // #8: x▲xx / ▲▼▲▼  — (0,1)=▲, 0 XOR 1 = 1
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 1 },

  // #9: ▲x▲ / ▼▲▼  — (0,0)=▲, 0 XOR 0 = 0
  { cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], baseParity: 0 },

  // #10: xxx▲ / ▲▼▲▼  — (0,3)=▲, 0 XOR 1 = 1
  { cells: [[0, 3], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 1 },

  // #11: ▲▼▲▼▲▼
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]], baseParity: 0 },

  // #12: x▲xxx / ▲▼▲▼▲  — (0,1)=▲, 0 XOR 1 = 1
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]], baseParity: 1 },

  // #13: ▲▼▲ / ▼▲▼  — (0,0)=▲, 0 XOR 0 = 0
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], baseParity: 0 },

  // #14: xxxx▲ / ▼▲▼▲▼  — (0,4)=▲, 0 XOR 0 = 0
  { cells: [[0, 4], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]], baseParity: 0 },

  // #15: xx▲xx / ▼▲▼▲▼  — (0,2)=▲, 0 XOR 0 = 0
  { cells: [[0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]], baseParity: 0 },

  // #16: ▼▲xx / ▲▼▲▼  — (0,0)=▼, 1 XOR 0 = 1
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 1 },

  // #17: xx▼▲ / ▲▼▲▼  — (0,2)=▼, 1 XOR 0 = 1
  { cells: [[0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 1 },

  // #18: x▼▲x / ▼▲▼▲  — (0,1)=▼, 1 XOR 1 = 0
  { cells: [[0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 0 },

  // #19: ▼▲▼ / ▲▼▲  — (0,0)=▼, 1 XOR 0 = 1
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], baseParity: 1 },

  // #20: ▲▼▲xx / xx▼▲▼  — (0,0)=▲, 0 XOR 0 = 0
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4]], baseParity: 0 },

  // #21: xxx▲▼ / ▲▼▲▼x  — (0,3)=▲, 0 XOR 1 = 1
  { cells: [[0, 3], [0, 4], [1, 0], [1, 1], [1, 2], [1, 3]], baseParity: 1 },

  // #22: ▲▼▲x / x▲▼▲  — (0,0)=▲, 0 XOR 0 = 0
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2], [1, 3]], baseParity: 0 },
];

// ---------------------------------------------------------------------------
// 三角グリッドの幾何学的変換
// ---------------------------------------------------------------------------
//
// 各三角セルの重心座標を実数で計算し、60°回転・水平反転を行ったあと
// 最近傍の重心を持つグリッドセルにマッピングする。
// ピボットは第一セルの apex（頂点）を使用。
//
// 重心座標 (side = 1):
//   cx = (col + 1) / 2
//   cy = row * H + (isUp ? 2H/3 : H/3)
//   where H = √3/2, isUp = (row + col + bp) % 2 === 0
// ---------------------------------------------------------------------------

const SQRT3 = Math.sqrt(3);
const TRI_H = SQRT3 / 2; // 正三角形の高さ (side = 1)

/** セルの重心座標 */
function cellCenter(
  row: number,
  col: number,
  bp: 0 | 1,
): [number, number] {
  const isUp = (row + col + bp) % 2 === 0;
  return [(col + 1) / 2, row * TRI_H + (isUp ? (2 * TRI_H) / 3 : TRI_H / 3)];
}

/** セルの apex (▲=上頂点, ▼=下頂点) */
function cellApex(
  row: number,
  col: number,
  bp: 0 | 1,
): [number, number] {
  const isUp = (row + col + bp) % 2 === 0;
  return [(col + 1) / 2, isUp ? row * TRI_H : (row + 1) * TRI_H];
}

/** 点をピボット周りに 60°×times CW 回転 */
function rotatePt(
  x: number,
  y: number,
  cx: number,
  cy: number,
  times: number,
): [number, number] {
  let rx = x - cx;
  let ry = y - cy;
  for (let i = 0; i < times; i++) {
    const nx = rx * 0.5 + ry * (SQRT3 / 2);
    const ny = -rx * (SQRT3 / 2) + ry * 0.5;
    rx = nx;
    ry = ny;
  }
  return [cx + rx, cy + ry];
}

/** 点をピボットの x 座標で水平反転 */
function flipPtH(
  x: number,
  y: number,
  pivotX: number,
): [number, number] {
  return [2 * pivotX - x, y];
}

/**
 * 座標 (x, y) が属するグリッドセル (row, col) を
 * 指定 bp の物理レイアウトで探す（最近傍重心）。
 *
 * bp=0 と bp=1 は別々の三角タイリングを形成するため、
 * 元のピースの baseParity と同じ空間で検索する必要がある。
 */
function findCell(
  x: number,
  y: number,
  bp: 0 | 1,
): [number, number] {
  const rowEst = Math.floor(y / TRI_H);
  const colEst = Math.round(2 * x - 1);
  let bestR = 0;
  let bestC = 0;
  let bestD = Infinity;
  for (let row = rowEst - 1; row <= rowEst + 2; row++) {
    for (let col = colEst - 3; col <= colEst + 3; col++) {
      const isUp = (row + col + bp) % 2 === 0;
      const cx = (col + 1) / 2;
      const cy = row * TRI_H + (isUp ? (2 * TRI_H) / 3 : TRI_H / 3);
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD) {
        bestR = row;
        bestC = col;
        bestD = d;
      }
    }
  }
  return [bestR, bestC];
}

// ---------------------------------------------------------------------------
// 変換ユーティリティ
// ---------------------------------------------------------------------------

/** min(row)=0, min(col)=0 に平行移動してソート */
function normalizePosition(cells: [number, number][]): [number, number][] {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minR, c - minC] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** 正規化済みセル配列 + baseParity を一意キー文字列に変換 */
function cellsToKey(sortedCells: [number, number][], baseParity: 0 | 1): string {
  return `${baseParity}:${sortedCells.map(([r, c]) => `${r},${c}`).join("|")}`;
}

/**
 * セル群の重心に最も近いセルを中心として選択。
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
 * 60°回転(6パターン) × 反転(2) = 最大12パターンの変換を適用し、
 * 正規化形状 + baseParity で重複排除してユニークバリアントを生成する。
 *
 * 幾何学的回転: 各セルの重心座標を実数で計算し、第一セルの apex を
 * ピボットとして 60°CW 回転 / 水平反転を行い、最近傍グリッドセルに
 * マッピングする。baseParity は正規化のシフト量から一意に決まる。
 */
function generateVariants(raw: RawPiece): {
  variants: PieceVariant[];
  transformToVariant: number[];
} {
  const seen = new Map<string, number>();
  const variants: PieceVariant[] = [];
  const transformToVariant = new Array<number>(12);

  // 各 raw セルの重心座標（raw.baseParity で配置）
  const centers = raw.cells.map(([r, c]) =>
    cellCenter(r, c, raw.baseParity),
  );

  // ピボット: 第一セルの apex
  const [pivotX, pivotY] = cellApex(
    raw.cells[0][0],
    raw.cells[0][1],
    raw.baseParity,
  );

  for (let rot = 0; rot < 6; rot++) {
    for (let flip = 0; flip < 2; flip++) {
      // flip → rotate の順で適用
      let transformed = centers;
      if (flip === 1) {
        transformed = transformed.map(([x, y]) => flipPtH(x, y, pivotX));
      }
      if (rot > 0) {
        transformed = transformed.map(([x, y]) =>
          rotatePt(x, y, pivotX, pivotY, rot),
        );
      }

      // raw.baseParity の物理レイアウトでグリッドセルを特定
      // (回転・反転はピボット頂点を中心に行うため、同じタイリング空間に留まる)
      const gridCells = transformed.map(([x, y]) =>
        findCell(x, y, raw.baseParity),
      );

      // 正規化（min=0 にシフト） & 中心計算
      const minR = Math.min(...gridCells.map(([r]) => r));
      const minC = Math.min(...gridCells.map(([, c]) => c));
      const normalized = normalizePosition(gridCells);
      const center = computeCenter(normalized);

      // 中心相対座標
      const relative = normalized.map(
        ([r, c]) => [r - center[0], c - center[1]] as readonly [number, number],
      );

      // baseParity: 配置先 (R,C) の (R+C)%2 == bp で正しい向きになる条件。
      // 絶対中心 = (minR + center[0], minC + center[1]) のパリティで決まる。
      const bp = ((((minR + minC + center[0] + center[1] + raw.baseParity) % 2) + 2) % 2) as 0 | 1;

      // dedup キー: normalized 座標 + baseParity
      const key = cellsToKey(normalized, bp);

      let vi: number;
      if (seen.has(key)) {
        vi = seen.get(key)!;
      } else {
        vi = variants.length;
        seen.set(key, vi);
        variants.push({ cells: relative, baseParity: bp });
      }

      transformToVariant[rot * 2 + flip] = vi;
    }
  }

  return { variants, transformToVariant };
}

// ---------------------------------------------------------------------------
// PIECES 定数 — モジュールロード時に1回だけ生成
// ---------------------------------------------------------------------------

function buildPieces(): readonly PieceDefinition[] {
  return RAW_PIECES.map((raw, id) => {
    const { variants, transformToVariant } = generateVariants(raw);
    return { id, size: raw.cells.length, variants, transformToVariant };
  });
}

/** 全22ピースの定義（バリアント含む） */
export const PIECES: readonly PieceDefinition[] = buildPieces();

/** 全ピースの全バリアント合計数 */
export const TOTAL_VARIANTS = PIECES.reduce(
  (sum, p) => sum + p.variants.length,
  0,
);

/** 全ピースの合計セル数 */
export const TOTAL_CELLS = PIECES.reduce((sum, p) => sum + p.size, 0);
