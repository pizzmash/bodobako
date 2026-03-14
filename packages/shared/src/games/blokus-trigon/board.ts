// ---------------------------------------------------------------------------
// ブロックストライゴン — ビットボードユーティリティ
// ---------------------------------------------------------------------------
// 18×35 = 630 ビットのビットボードを bigint で演算する。
// bit 位置 = row * 35 + col （bit 0 = (0,0)左上, bit 629 = (17,34)右下）
// State 上は hex 文字列で保持し、ここで bigint と相互変換する。
//
// 三角グリッドの隣接定義:
//   ▲ (isUp=true):  辺隣接 = 左(col-1), 右(col+1), 下(row+1,col)
//   ▼ (isUp=false): 辺隣接 = 左(col-1), 右(col+1), 上(row-1,col)
//
//   ▲ の角隣接(頂点共有・辺非共有):
//     上左(row-1,col-1), 上右(row-1,col+1),
//     下左遠(row+1,col-2), 下右遠(row+1,col+2),
//     上(row-1,col),   ← ▼セルの底辺と▲セルの上頂点で頂点共有
//     下(row+1,col+1)? → 要検証
//
//   実際は三角グリッドの頂点共有関係から導出する（下記実装参照）
// ---------------------------------------------------------------------------

import { GRID_COLS, GRID_ROWS, START_POSITIONS } from "./types.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BITS = BigInt(GRID_ROWS * GRID_COLS); // 630n
const ROW = BigInt(GRID_COLS);              // 35n

// ---------------------------------------------------------------------------
// 有効セルの行範囲定義
// ---------------------------------------------------------------------------

/**
 * 各行の有効セル範囲 [startCol, endCol]（endCol 含む）。
 * row 0: col 8〜26 (19セル)
 * row 1: col 7〜27 (21セル)
 * ...
 * row 8: col 0〜34 (35セル)
 * row 9: col 0〜34 (35セル)
 * row 10: col 1〜33 (33セル)
 * ...
 * row 17: col 8〜26 (19セル)
 */
export const ROW_RANGES: readonly (readonly [number, number])[] = (() => {
  const ranges: [number, number][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    let startCol: number;
    let endCol: number;
    if (r <= 8) {
      // 上半分: row 0→col 8, row 1→col 7, ..., row 8→col 0
      startCol = 8 - r;
      endCol = 26 + r;
    } else {
      // 下半分: row 9→col 0, row 10→col 1, ..., row 17→col 8
      startCol = r - 9;
      endCol = 34 - (r - 9);
    }
    ranges.push([startCol, endCol]);
  }
  return ranges;
})();

// ---------------------------------------------------------------------------
// マスク生成
// ---------------------------------------------------------------------------

/** 盤面全体マスク（630ビット全1） */
export const FULL_MASK = (1n << BITS) - 1n;

/** 有効セルマスク (486セル) */
export const VALID_MASK: bigint = (() => {
  let mask = 0n;
  for (let r = 0; r < GRID_ROWS; r++) {
    const [sc, ec] = ROW_RANGES[r];
    for (let c = sc; c <= ec; c++) {
      mask |= 1n << BigInt(r * GRID_COLS + c);
    }
  }
  return mask;
})();

/** ▲セルマスク ((row + col) % 2 === 0 のセル、VALID_MASK 内のみ) */
export const UP_MASK: bigint = (() => {
  let mask = 0n;
  for (let r = 0; r < GRID_ROWS; r++) {
    const [sc, ec] = ROW_RANGES[r];
    for (let c = sc; c <= ec; c++) {
      if ((r + c) % 2 === 0) {
        mask |= 1n << BigInt(r * GRID_COLS + c);
      }
    }
  }
  return mask;
})();

/** ▼セルマスク */
export const DOWN_MASK: bigint = VALID_MASK & ~UP_MASK;

/**
 * 外周1マスのマスク（3人プレイ時に配置禁止）。
 *
 * 六角形ボードの辺に対して垂直方向に「1セル深」を均等に保つと、
 * 水平辺（最上行・最下行）は全セル、斜辺（中間行）は両端2セルずつが外周になる。
 * これは三角グリッドの幾何学的特性（斜辺1セル深 ≒ 横方向2セル幅）に由来する。
 */
export const BORDER_MASK: bigint = (() => {
  let mask = 0n;
  for (let r = 0; r < GRID_ROWS; r++) {
    const [sc, ec] = ROW_RANGES[r];
    if (r === 0 || r === GRID_ROWS - 1) {
      // 最上行・最下行は全セル外周
      for (let c = sc; c <= ec; c++) {
        mask |= 1n << BigInt(r * GRID_COLS + c);
      }
    } else {
      // 中間行: 両端2セルずつ（斜辺の1セル深は横方向2セル幅に相当）
      mask |= 1n << BigInt(r * GRID_COLS + sc);
      mask |= 1n << BigInt(r * GRID_COLS + sc + 1);
      mask |= 1n << BigInt(r * GRID_COLS + ec - 1);
      mask |= 1n << BigInt(r * GRID_COLS + ec);
    }
  }
  return mask;
})();

/** col=0 のビット列マスク */
export const LEFT_COL_MASK: bigint = (() => {
  let m = 0n;
  for (let r = 0; r < GRID_ROWS; r++) {
    m |= 1n << BigInt(r * GRID_COLS);
  }
  return m;
})();

/** col=34 のビット列マスク */
export const RIGHT_COL_MASK: bigint = (() => {
  let m = 0n;
  for (let r = 0; r < GRID_ROWS; r++) {
    m |= 1n << BigInt(r * GRID_COLS + GRID_COLS - 1);
  }
  return m;
})();

// ---------------------------------------------------------------------------
// hex ⇔ bigint 変換
// ---------------------------------------------------------------------------

/** hex 文字列 → bigint */
export function toBigInt(hex: string): bigint {
  return hex === "0" ? 0n : BigInt("0x" + hex);
}

/** bigint → hex 文字列 */
export function toHex(bb: bigint): string {
  return bb.toString(16);
}

// ---------------------------------------------------------------------------
// セル種別判定
// ---------------------------------------------------------------------------

/** (row, col) が ▲ セルかどうか */
export function isUpTriangle(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

/** (row, col) が有効セルかどうか */
export function isValidCell(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;
  const [sc, ec] = ROW_RANGES[row];
  return col >= sc && col <= ec;
}

/** (row, col) が外周セル（3人戦の配置禁止エリア）かどうか */
export function isTrigonBorderCell(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS) return false;
  const [sc, ec] = ROW_RANGES[row];
  if (row === 0 || row === GRID_ROWS - 1) return col >= sc && col <= ec;
  return col === sc || col === sc + 1 || col === ec - 1 || col === ec;
}

// ---------------------------------------------------------------------------
// 開始位置ビット
// ---------------------------------------------------------------------------

/** 色 index のスタート位置ビット（1ビットだけ立った bigint） */
export function startBitFor(
  colorIndex: number,
  positions: readonly (readonly [number, number])[] = START_POSITIONS,
): bigint {
  const [r, c] = positions[colorIndex];
  return 1n << BigInt(r * GRID_COLS + c);
}

// ---------------------------------------------------------------------------
// ピース → ビットボード変換
// ---------------------------------------------------------------------------

/**
 * ピースの相対セル列を (row, col) 中心で盤面ビットボードに変換。
 * 盤面外 or VALID_MASK 外にはみ出す場合は null を返す。
 */
export function pieceToBitboard(
  cells: readonly (readonly [number, number])[],
  row: number,
  col: number,
): bigint | null {
  let bb = 0n;
  for (const [dr, dc] of cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return null;
    bb |= 1n << BigInt(r * GRID_COLS + c);
  }
  // VALID_MASK 外にはみ出していないかチェック
  if ((bb & VALID_MASK) !== bb) return null;
  return bb;
}

// ---------------------------------------------------------------------------
// シフト演算（隣接セル計算）
// ---------------------------------------------------------------------------

/** 上シフト: bit >> 35 */
function shiftUp(bb: bigint): bigint {
  return (bb >> ROW) & FULL_MASK;
}

/** 下シフト: bit << 35 */
function shiftDown(bb: bigint): bigint {
  return (bb << ROW) & FULL_MASK;
}

/** 左シフト: bit >> 1（右列からのラップ防止） */
function shiftLeft(bb: bigint): bigint {
  return (bb >> 1n) & ~RIGHT_COL_MASK & FULL_MASK;
}

/** 右シフト: bit << 1（左列からのラップ防止） */
function shiftRight(bb: bigint): bigint {
  return (bb << 1n) & ~LEFT_COL_MASK & FULL_MASK;
}

/** 左2シフト: bit >> 2 */
function shiftLeft2(bb: bigint): bigint {
  return (bb >> 2n) & ~RIGHT_COL_MASK & ~(RIGHT_COL_MASK >> 1n) & FULL_MASK;
}

/** 右2シフト: bit << 2 */
function shiftRight2(bb: bigint): bigint {
  return (bb << 2n) & ~LEFT_COL_MASK & ~(LEFT_COL_MASK << 1n) & FULL_MASK;
}

// ---------------------------------------------------------------------------
// 隣接セル計算
// ---------------------------------------------------------------------------

/**
 * 辺隣接セル — 自身を除く。
 *
 * 三角グリッド辺隣接:
 *   ▲: 左(col-1), 右(col+1), 下(row+1, col)
 *   ▼: 左(col-1), 右(col+1), 上(row-1, col)
 */
export function getEdgeAdjacent(bb: bigint): bigint {
  const up = bb & UP_MASK;   // ▲セルのみ
  const down = bb & DOWN_MASK; // ▼セルのみ

  // 左右は全セル共通
  const lr = shiftLeft(bb) | shiftRight(bb);

  // ▲セルの下隣接 (row+1, col)
  const upDown = shiftDown(up);

  // ▼セルの上隣接 (row-1, col)
  const downUp = shiftUp(down);

  return (lr | upDown | downUp) & ~bb & VALID_MASK;
}

/**
 * 角隣接セル（頂点を共有するが辺を共有しないセル）— 自身を除く。
 *
 * 各セルは3頂点を持ち、各頂点を6セルが共有する。
 * 自身(1) + 辺隣接(2) + 角隣接(3) = 6 なので、各頂点あたり3つの角隣接。
 * 3頂点 × 3角隣接 = 9セルが各セルの角隣接集合。
 *
 * ▲(r,c) の3頂点と角隣接セル:
 *   上頂点:    ▼(r-1,c),   ▲(r-1,c-1), ▲(r-1,c+1)
 *   下左頂点:  ▲(r,c-2),   ▲(r+1,c-1), ▼(r+1,c-2)
 *   下右頂点:  ▲(r,c+2),   ▲(r+1,c+1), ▼(r+1,c+2)
 *
 * ▼(r,c) の3頂点と角隣接セル:
 *   下頂点:    ▲(r+1,c),   ▼(r+1,c-1), ▼(r+1,c+1)
 *   上左頂点:  ▼(r,c-2),   ▼(r-1,c-1), ▲(r-1,c-2)
 *   上右頂点:  ▼(r,c+2),   ▼(r-1,c+1), ▲(r-1,c+2)
 */
export function getCornerAdjacent(bb: bigint): bigint {
  const up = bb & UP_MASK;   // ▲セルのみ
  const down = bb & DOWN_MASK; // ▼セルのみ

  // ▲ の角隣接 (9セル):
  const upCorner =
    shiftUp(up) |                         // (row-1, col)   ▼  ← 上頂点・先端共有
    shiftLeft(shiftUp(up)) |              // (row-1, col-1) ▲
    shiftRight(shiftUp(up)) |             // (row-1, col+1) ▲
    shiftLeft2(up) |                      // (row,   col-2) ▲  ← 下左頂点
    shiftLeft(shiftDown(up)) |            // (row+1, col-1) ▲
    shiftLeft2(shiftDown(up)) |           // (row+1, col-2) ▼
    shiftRight2(up) |                     // (row,   col+2) ▲  ← 下右頂点
    shiftRight(shiftDown(up)) |           // (row+1, col+1) ▲
    shiftRight2(shiftDown(up));           // (row+1, col+2) ▼

  // ▼ の角隣接 (9セル):
  const downCorner =
    shiftDown(down) |                     // (row+1, col)   ▲  ← 下頂点・先端共有
    shiftLeft(shiftDown(down)) |          // (row+1, col-1) ▼
    shiftRight(shiftDown(down)) |         // (row+1, col+1) ▼
    shiftLeft2(down) |                    // (row,   col-2) ▼  ← 上左頂点
    shiftLeft(shiftUp(down)) |            // (row-1, col-1) ▼
    shiftLeft2(shiftUp(down)) |           // (row-1, col-2) ▲
    shiftRight2(down) |                   // (row,   col+2) ▼  ← 上右頂点
    shiftRight(shiftUp(down)) |           // (row-1, col+1) ▼
    shiftRight2(shiftUp(down));           // (row-1, col+2) ▲

  return (upCorner | downCorner) & ~bb & VALID_MASK;
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** セットビット数を数える（ポップカウント） */
export function popcount(bb: bigint): number {
  let count = 0;
  let v = bb;
  while (v !== 0n) {
    v &= v - 1n;
    count++;
  }
  return count;
}

/** セットビットのインデックスを列挙する */
export function bitPositions(bb: bigint): number[] {
  const positions: number[] = [];
  let v = bb;
  let idx = 0;
  while (v !== 0n) {
    if (v & 1n) positions.push(idx);
    v >>= 1n;
    idx++;
  }
  return positions;
}

/**
 * ビットボードを (row, col) 座標ペアの配列に変換する。
 */
export function bitToCoords(bb: bigint): [number, number][] {
  return bitPositions(bb).map((pos) => [
    Math.floor(pos / GRID_COLS),
    pos % GRID_COLS,
  ]);
}
