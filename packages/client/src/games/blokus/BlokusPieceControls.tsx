/**
 * ピース操作コントロール
 * 選択中ピースの現在バリアントをプレビュー表示し、
 * 回転・反転ボタンを提供する。
 */

import React from "react";
import { PIECES } from "@bodobako/shared";
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
      <div style={styles.container}>
        <div style={styles.emptyIcon}>✦</div>
        <div style={styles.placeholder}>ピースを選んでください</div>
      </div>
    );
  }

  const piece = PIECES[selectedPieceId];
  const numVariants = piece.variants.length;
  const variant = piece.variants[variantIndex];

  return (
    <div style={styles.container}>
      {/* バリアントプレビュー */}
      <div style={styles.previewArea}>
        <div
          style={{
            ...styles.previewGlow,
            background: `radial-gradient(ellipse at center, ${color}22 0%, transparent 70%)`,
          }}
        />
        <PieceThumbnail variant={variant} color={color} cellSize={PREVIEW_CELL} cellGap={2} />
      </div>

      {/* バリアント番号 */}
      <div style={styles.variantInfo}>
        バリアント {variantIndex + 1} / {numVariants}
      </div>

      {/* 回転・反転ボタン */}
      <div style={styles.buttonRow}>
        <button
          className="blk-ctrl-btn"
          style={{ ...styles.btn, borderColor: `${color}66`, background: `${color}18` }}
          onClick={onRotate}
          title="90°時計回りに回転"
        >
          <span style={styles.btnIcon}>↻</span>
          <span>回転</span>
        </button>
        <button
          className="blk-ctrl-btn"
          style={{
            ...styles.btn,
            borderColor: numVariants <= 1 ? SURFACE_BORDER : `${color}66`,
            background: numVariants <= 1 ? "transparent" : `${color}18`,
            opacity: numVariants <= 1 ? 0.3 : 1,
            cursor: numVariants <= 1 ? "default" : "pointer",
          }}
          onClick={onFlip}
          disabled={numVariants <= 1}
          title="水平反転"
        >
          <span style={styles.btnIcon}>⇄</span>
          <span>反転</span>
        </button>
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(255,255,255,0.88)",
    borderRadius: 16,
    padding: "0.85rem 0.75rem",
    border: `1px solid rgba(0,0,0,0.07)`,
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(100,120,180,0.1), 0 1px 4px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.55rem",
    minHeight: 120,
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: "1.5rem",
    opacity: 0.2,
    color: TEXT_PRIMARY,
  },
  placeholder: {
    fontSize: "0.8rem",
    color: TEXT_MUTED,
    letterSpacing: "0.02em",
  },
  previewArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    padding: "0.25rem",
    position: "relative",
  },
  previewGlow: {
    position: "absolute",
    inset: -20,
    pointerEvents: "none",
    borderRadius: "50%",
  },
  variantInfo: {
    fontSize: "0.7rem",
    color: TEXT_MUTED,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  buttonRow: {
    display: "flex",
    gap: "0.45rem",
    width: "100%",
  },
  btn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3rem",
    padding: "0.4rem 0.5rem",
    fontSize: "0.8rem",
    borderRadius: 10,
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 600,
    color: TEXT_PRIMARY,
    letterSpacing: "0.02em",
  },
  btnIcon: {
    fontSize: "1rem",
    lineHeight: 1,
  },
};
