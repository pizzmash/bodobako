/**
 * ピース操作コントロール（60° 回転 / 反転）
 */

import { TRIGON_PIECES } from "@bodobako/shared";
import React from "react";
import { PREVIEW_TRI_SIDE, SURFACE_BORDER, TRIGON_COLORS } from "./constants";
import { TriPieceThumbnail } from "./TriPieceThumbnail";

interface Props {
  selectedPieceId: number | null;
  variantIndex: number;
  colorIndex: number;
  onRotate: () => void;
  onFlip: () => void;
}

export const BlokusTrigonPieceControls = React.memo(
  function BlokusTrigonPieceControls({
    selectedPieceId,
    variantIndex,
    colorIndex,
    onRotate,
    onFlip,
  }: Props) {
    const color = TRIGON_COLORS[colorIndex]?.fill ?? TRIGON_COLORS[0].fill;

    if (selectedPieceId === null) {
      return (
        <div className="blk-piece-controls-container">
          <div className="text-[1.5rem] opacity-20 text-slate-800">
            ✦
          </div>
          <div className="text-[0.8rem] tracking-[0.02em] text-slate-400">
            ピースを選んでください
          </div>
        </div>
      );
    }

    const piece = TRIGON_PIECES[selectedPieceId];
    const numVariants = piece.variants.length;
    const variant = piece.variants[variantIndex];

    return (
      <div className="blk-piece-controls-container">
        {/* バリアントプレビュー */}
        <div className="flex items-center justify-center min-h-[60px] p-1 relative">
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              inset: -20,
              background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 70%)`,
            }}
          />
          <TriPieceThumbnail
            variant={variant}
            color={color}
            triSide={PREVIEW_TRI_SIDE}
          />
        </div>

        {/* バリアント番号 */}
        <div className="text-[0.7rem] tracking-[0.05em] uppercase text-slate-400">
          バリアント {variantIndex + 1} / {numVariants}
        </div>

        {/* 回転・反転ボタン */}
        <div className="flex gap-[0.45rem] w-full">
          <button
            className="blk-ctrl-btn blk-ctrl-btn-base"
            style={{
              borderColor: `${color}66`,
              background: `${color}18`,
            }}
            onClick={onRotate}
            title="60°時計回りに回転"
          >
            <span className="text-[1rem] leading-none">↻</span>
            <span>回転</span>
          </button>
          <button
            className="blk-ctrl-btn blk-ctrl-btn-base"
            style={{
              borderColor:
                numVariants <= 1 ? SURFACE_BORDER : `${color}66`,
              background:
                numVariants <= 1 ? "transparent" : `${color}18`,
            }}
            onClick={onFlip}
            disabled={numVariants <= 1}
            title="水平反転"
          >
            <span className="text-[1rem] leading-none">⇄</span>
            <span>反転</span>
          </button>
        </div>
      </div>
    );
  },
);
