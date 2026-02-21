// ---------------------------------------------------------------------------
// ブロックス — ビットボードユーティリティ
// ---------------------------------------------------------------------------
// 20×20 = 400 ビットのビットボードを bigint で演算する。
// bit 位置 = row * 20 + col （bit 0 = (0,0)左上, bit 399 = (19,19)右下）
// State 上は hex 文字列で保持し、ここで bigint と相互変換する。
// ---------------------------------------------------------------------------

import { BOARD_SIZE, START_CORNERS } from "./types.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BITS = BigInt(BOARD_SIZE * BOARD_SIZE); // 400n
const ROW = BigInt(BOARD_SIZE);               // 20n

/** 盤面全体マスク（400ビット全1） */
export const BOARD_MASK = (1n << BITS) - 1n;

/** col=0 のビット列マスク（bit 0, 20, 40, …, 380） */
export const LEFT_COL_MASK = (() => {
  let m = 0n;
  for (let r = 0; r < BOARD_SIZE; r++) {
    m |= 1n << BigInt(r * BOARD_SIZE);
  }
  return m;
})();

/** col=19 のビット列マスク（bit 19, 39, …, 399） */
export const RIGHT_COL_MASK = (() => {
  let m = 0n;
  for (let r = 0; r < BOARD_SIZE; r++) {
    m |= 1n << BigInt(r * BOARD_SIZE + BOARD_SIZE - 1);
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
// 開始角ビット
// ---------------------------------------------------------------------------

/** 色 index の開始角ビット（1ビットだけ立った bigint） */
export function cornerBitFor(colorIndex: number): bigint {
  const [r, c] = START_CORNERS[colorIndex];
  return 1n << BigInt(r * BOARD_SIZE + c);
}

// ---------------------------------------------------------------------------
// ピース → ビットボード変換
// ---------------------------------------------------------------------------

/**
 * ピースの相対セル列を (row, col) 中心で盤面ビットボードに変換。
 * 盤面外にはみ出す場合は null を返す。
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
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
    bb |= 1n << BigInt(r * BOARD_SIZE + c);
  }
  return bb;
}

// ---------------------------------------------------------------------------
// シフト演算（隣接セル計算）
// ---------------------------------------------------------------------------

/** 上シフト: bit >> 20 */
function shiftUp(bb: bigint): bigint {
  return (bb >> ROW) & BOARD_MASK;
}

/** 下シフト: bit << 20 */
function shiftDown(bb: bigint): bigint {
  return (bb << ROW) & BOARD_MASK;
}

/** 左シフト: bit >> 1（右列からのラップ防止） */
function shiftLeft(bb: bigint): bigint {
  return (bb >> 1n) & ~RIGHT_COL_MASK & BOARD_MASK;
}

/** 右シフト: bit << 1（左列からのラップ防止） */
function shiftRight(bb: bigint): bigint {
  return (bb << 1n) & ~LEFT_COL_MASK & BOARD_MASK;
}

// ---------------------------------------------------------------------------
// 隣接セル計算
// ---------------------------------------------------------------------------

/** 辺隣接セル（上下左右） — 自身を除く */
export function getEdgeAdjacent(bb: bigint): bigint {
  return (shiftUp(bb) | shiftDown(bb) | shiftLeft(bb) | shiftRight(bb)) & ~bb & BOARD_MASK;
}

/** 角隣接セル（斜め4方向） — 自身を除く */
export function getCornerAdjacent(bb: bigint): bigint {
  // 左上 = (bb >> 21) & ~RIGHT_COL_MASK
  const lu = (bb >> (ROW + 1n)) & ~RIGHT_COL_MASK & BOARD_MASK;
  // 右上 = (bb >> 19) & ~LEFT_COL_MASK
  const ru = (bb >> (ROW - 1n)) & ~LEFT_COL_MASK & BOARD_MASK;
  // 左下 = (bb << 19) & ~RIGHT_COL_MASK
  const ld = (bb << (ROW - 1n)) & ~RIGHT_COL_MASK & BOARD_MASK;
  // 右下 = (bb << 21) & ~LEFT_COL_MASK
  const rd = (bb << (ROW + 1n)) & ~LEFT_COL_MASK & BOARD_MASK;
  return (lu | ru | ld | rd) & ~bb & BOARD_MASK;
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
    if (v & 1n) {
      positions.push(idx);
    }
    v >>= 1n;
    idx++;
  }
  return positions;
}

/**
 * ビットボードを (row, col) 座標ペアの配列に変換する。
 * 描画・デバッグ用。
 */
export function bitToCoords(bb: bigint): [number, number][] {
  return bitPositions(bb).map((pos) => [
    Math.floor(pos / BOARD_SIZE),
    pos % BOARD_SIZE,
  ]);
}
