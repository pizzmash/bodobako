/**
 * ピース操作コントロール
 * 選択中ピースの現在バリアントをプレビュー表示し、
 * 回転・反転ボタンを提供する。
 */

import { PIECES } from "@bodobako/shared";
import React from "react";
import { BLOKUS_COLORS, PREVIEW_CELL, SURFACE_BORDER, TEXT_MUTED, TEXT_PRIMARY } from "./constants";
import { PieceThumbnail } from "./PieceThumbnail";

interface BlokusPieceControlsProps {
  selectedPieceId: number | null;
  variantIndex: number;
  colorIndex: number;
  onRotate: () => void;
  onFlip: () => void;
}

export const BlokusPieceControls = React.memo(function BlokusPieceControls({
  selectedPieceId,
  variantIndex,
  colorIndex,
  onRotate,
  onFlip,
}: BlokusPieceControlsProps) {
  const color = BLOKUS_COLORS[colorIndex].fill;

  if (selectedPieceId === null) {
    return (
      <div className="blk-piece-controls-container">
        <div className="text-[1.5rem] opacity-20" style={{ color: TEXT_PRIMARY }}>✦</div>
        <div className="text-[0.8rem] tracking-[0.02em]" style={{ color: TEXT_MUTED }}>ピースを選んでください</div>
      </div>
    );
  }

  const piece = PIECES[selectedPieceId];
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
        <PieceThumbnail variant={variant} color={color} cellSize={PREVIEW_CELL} cellGap={2} />
      </div>

      {/* バリアント番号 */}
      <div className="text-[0.7rem] tracking-[0.05em] uppercase" style={{ color: TEXT_MUTED }}>
        バリアント {variantIndex + 1} / {numVariants}
      </div>

      {/* 回転・反転ボタン */}
      <div className="flex gap-[0.45rem] w-full">
        <button
          className="blk-ctrl-btn blk-ctrl-btn-base"
          style={{ borderColor: `${color}66`, background: `${color}18` }}
          onClick={onRotate}
          title="90°時計回りに回転"
        >
          <span className="text-[1rem] leading-none">↻</span>
          <span>回転</span>
        </button>
        <button
          className="blk-ctrl-btn blk-ctrl-btn-base"
          style={{
            borderColor: numVariants <= 1 ? SURFACE_BORDER : `${color}66`,
            background: numVariants <= 1 ? "transparent" : `${color}18`,
            opacity: numVariants <= 1 ? 0.3 : 1,
            cursor: numVariants <= 1 ? "default" : "pointer",
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
});
