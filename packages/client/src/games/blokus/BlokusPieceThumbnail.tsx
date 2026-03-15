/**
 * ブロックスピースのミニ SVG サムネイル。
 * PieceVariant（中心相対オフセット）を受け取り、
 * バウンディングボックスを計算して正方形セルを描画する。
 */

import type { PieceVariant } from "@bodobako/shared";
import { memo } from "react";

const CELL = 7;
const GAP = 1;
const STEP = CELL + GAP;

interface BlokusPieceThumbnailProps {
  variant: PieceVariant;
  color: string;
}

export const BlokusPieceThumbnail = memo(function BlokusPieceThumbnail({
  variant,
  color,
}: BlokusPieceThumbnailProps) {
  const cells = variant.cells;
  if (cells.length === 0) return null;

  const minR = Math.min(...cells.map(([dr]) => dr));
  const minC = Math.min(...cells.map(([, dc]) => dc));
  const maxR = Math.max(...cells.map(([dr]) => dr));
  const maxC = Math.max(...cells.map(([, dc]) => dc));

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const totalW = cols * STEP - GAP;
  const totalH = rows * STEP - GAP;

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ flexShrink: 0 }}
    >
      {[...cells].map(([dr, dc]) => (
        <rect
          key={`${dr},${dc}`}
          x={(dc - minC) * STEP}
          y={(dr - minR) * STEP}
          width={CELL}
          height={CELL}
          fill={color}
          rx={1}
        />
      ))}
    </svg>
  );
});
