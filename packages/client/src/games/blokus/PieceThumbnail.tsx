/**
 * ピース形状のミニ描画コンポーネント。
 * PieceVariant.cells（中心相対オフセット）を受け取り、
 * バウンディングボックスを計算してセルを absolute 配置で描画する。
 */

import type { PieceVariant } from "@bodobako/shared";
import { memo } from "react";
import { MINI_CELL, MINI_CELL_GAP } from "./constants";

interface PieceThumbnailProps {
  variant: PieceVariant;
  color: string;
  cellSize?: number;
  cellGap?: number;
}

export const PieceThumbnail = memo(function PieceThumbnail({
  variant,
  color,
  cellSize = MINI_CELL,
  cellGap = MINI_CELL_GAP,
}: PieceThumbnailProps) {
  const cells = variant.cells;

  if (cells.length === 0) return null;

  const minR = Math.min(...cells.map(([dr]) => dr));
  const maxR = Math.max(...cells.map(([dr]) => dr));
  const minC = Math.min(...cells.map(([, dc]) => dc));
  const maxC = Math.max(...cells.map(([, dc]) => dc));

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const totalW = cols * cellSize + (cols - 1) * cellGap;
  const totalH = rows * cellSize + (rows - 1) * cellGap;

  const cellSet = new Set(cells.map(([dr, dc]) => `${dr - minR},${dc - minC}`));
  const radius = Math.max(1, Math.round(cellSize * 0.15));

  return (
    <div
      style={{
        position: "relative",
        width: totalW,
        height: totalH,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
          cellSet.has(`${r},${c}`) ? (
            <div
              key={`${r},${c}`}
              style={{
                position: "absolute",
                left: c * (cellSize + cellGap),
                top: r * (cellSize + cellGap),
                width: cellSize,
                height: cellSize,
                background: color,
                borderRadius: radius,
              }}
            />
          ) : null,
        ),
      )}
    </div>
  );
});
