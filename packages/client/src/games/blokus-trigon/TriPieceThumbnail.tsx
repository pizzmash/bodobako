/**
 * 三角ピースのミニ SVG サムネイル。
 * PieceVariant.cells（中心相対オフセット）を受け取り、
 * バウンディングボックスを計算して三角ポリゴンを描画する。
 */

import type { TrigonPieceVariant } from "@bodobako/shared";
import { memo } from "react";
import { MINI_TRI_SIDE } from "./constants";
import { miniTriPoints } from "./triUtil";

interface TriPieceThumbnailProps {
  variant: TrigonPieceVariant;
  color: string;
  triSide?: number;
}

export const TriPieceThumbnail = memo(function TriPieceThumbnail({
  variant,
  color,
  triSide = MINI_TRI_SIDE,
}: TriPieceThumbnailProps) {
  const cells = variant.cells;
  if (cells.length === 0) return null;

  const h = triSide * Math.sqrt(3) / 2;

  const minR = Math.min(...cells.map(([dr]) => dr));
  const maxR = Math.max(...cells.map(([dr]) => dr));
  const minC = Math.min(...cells.map(([, dc]) => dc));
  const maxC = Math.max(...cells.map(([, dc]) => dc));

  // min=0 シフトで (dr+dc)%2 が変わる場合があるため bp を補正
  const bp = (((variant.baseParity + minR + minC) % 2) + 2) % 2 as 0 | 1;

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  const totalW = (cols + 1) * (triSide / 2);
  const totalH = rows * h;

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ flexShrink: 0 }}
    >
      {cells.map(([dr, dc]) => (
        <polygon
          key={`${dr},${dc}`}
          points={miniTriPoints(dr - minR, dc - minC, triSide, bp)}
          fill={color}
          stroke={color}
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
});
