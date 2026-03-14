/**
 * 三角セルの SVG polygon ポイントを計算するユーティリティ。
 *
 * ▲ (isUp=true):  上頂点, 左下, 右下
 * ▼ (isUp=false): 左上, 右上, 下頂点
 *
 * 配置座標の変換:
 *   x = BOARD_MARGIN + col * (TRI_SIDE / 2)
 *   y (▲) = BOARD_MARGIN + row * TRI_HEIGHT
 *   y (▼) = BOARD_MARGIN + row * TRI_HEIGHT
 */

import { isUpTriangle, isValidCell } from "@bodobako/shared";
import { BOARD_MARGIN, TRI_HEIGHT, TRI_SIDE } from "./constants";

/** 三角セルの中心 (cx, cy) を計算する */
export function triCenter(row: number, col: number): { cx: number; cy: number } {
  const isUp = isUpTriangle(row, col);
  const x = BOARD_MARGIN + col * (TRI_SIDE / 2);
  const y = BOARD_MARGIN + row * TRI_HEIGHT;

  if (isUp) {
    // ▲: 重心 = 底辺の中央から 1/3 高さ上
    return { cx: x + TRI_SIDE / 2, cy: y + TRI_HEIGHT * 2 / 3 };
  } else {
    // ▼: 重心 = 上辺の中央から 1/3 高さ下
    return { cx: x + TRI_SIDE / 2, cy: y + TRI_HEIGHT / 3 };
  }
}

/** 三角セルの SVG polygon points 文字列を返す */
export function triPoints(row: number, col: number): string {
  const isUp = isUpTriangle(row, col);
  const x = BOARD_MARGIN + col * (TRI_SIDE / 2);
  const y = BOARD_MARGIN + row * TRI_HEIGHT;

  if (isUp) {
    // ▲: 上頂点, 左下, 右下
    const topX = x + TRI_SIDE / 2;
    const topY = y;
    const blX = x;
    const blY = y + TRI_HEIGHT;
    const brX = x + TRI_SIDE;
    const brY = y + TRI_HEIGHT;
    return `${topX},${topY} ${blX},${blY} ${brX},${brY}`;
  } else {
    // ▼: 左上, 右上, 下頂点
    const tlX = x;
    const tlY = y;
    const trX = x + TRI_SIDE;
    const trY = y;
    const botX = x + TRI_SIDE / 2;
    const botY = y + TRI_HEIGHT;
    return `${tlX},${tlY} ${trX},${trY} ${botX},${botY}`;
  }
}

/**
 * ミニサムネイル用: 相対座標 (dr, dc) をピース中心 (0,0) 基準で
 * SVG polygon points に変換する。
 */
export function miniTriPoints(dr: number, dc: number, triSide: number, baseParity: 0 | 1 = 0): string {
  const h = triSide * Math.sqrt(3) / 2;
  const isUp = (dr + dc + baseParity) % 2 === 0;
  const x = dc * (triSide / 2);
  const y = dr * h;

  if (isUp) {
    return `${x + triSide / 2},${y} ${x},${y + h} ${x + triSide},${y + h}`;
  } else {
    return `${x},${y} ${x + triSide},${y} ${x + triSide / 2},${y + h}`;
  }
}

/**
 * SVG座標 (svgX, svgY) から最も近い有効な盤面セル (row, col) を返す。
 * 見つからない場合は null を返す。
 */
export function svgToCell(svgX: number, svgY: number): { row: number; col: number } | null {
  // 大まかな row 推定
  const rawRow = (svgY - BOARD_MARGIN) / TRI_HEIGHT;
  const row = Math.floor(rawRow);

  if (row < 0 || row >= 18) return null;

  // col の推定（三角タイルは TRI_SIDE/2 ずつ）
  const rawCol = (svgX - BOARD_MARGIN) / (TRI_SIDE / 2);
  const col = Math.floor(rawCol);

  if (col < 0 || col >= 35) return null;

  // 有効セルか確認
  if (!isValidCell(row, col)) {
    // 近隣セルを試す
    for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (isValidCell(nr, nc)) {
        return { row: nr, col: nc };
      }
    }
    return null;
  }

  return { row, col };
}
