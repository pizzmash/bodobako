/**
 * ピース操作コントロール
 * 選択中ピースの現在バリアントをプレビュー表示し、
 * 回転・反転ボタンを提供する。
 */

import { PIECES } from "@bodobako/shared";
import { BLOKUS_COLORS, PREVIEW_CELL } from "./constants";
import { PieceThumbnail } from "./PieceThumbnail";

interface BlokusPieceControlsProps {
  selectedPieceId: number | null;
  variantIndex: number;
  colorIndex: number;
  onRotate: () => void;
  onFlip: () => void;
}

export function BlokusPieceControls({
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
        <div style={styles.placeholder}>ピースを選択してください</div>
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
        <PieceThumbnail variant={variant} color={color} cellSize={PREVIEW_CELL} cellGap={2} />
      </div>

      {/* バリアント番号 */}
      <div style={styles.variantInfo}>
        {variantIndex + 1} / {numVariants}
      </div>

      {/* 回転・反転ボタン */}
      <div style={styles.buttonRow}>
        <button
          style={{ ...styles.btn, borderColor: color }}
          onClick={onRotate}
          title="90°時計回りに回転"
        >
          回転 ↻
        </button>
        <button
          style={{
            ...styles.btn,
            borderColor: color,
            opacity: numVariants <= 1 ? 0.35 : 1,
            cursor: numVariants <= 1 ? "default" : "pointer",
          }}
          onClick={onFlip}
          disabled={numVariants <= 1}
          title="水平反転"
        >
          反転 ⇄
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#fff",
    borderRadius: 12,
    padding: "0.75rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    minHeight: 110,
    justifyContent: "center",
  },
  placeholder: {
    fontSize: "0.82rem",
    color: "#9ca3af",
  },
  previewArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    padding: "0.25rem",
  },
  variantInfo: {
    fontSize: "0.72rem",
    color: "#9ca3af",
  },
  buttonRow: {
    display: "flex",
    gap: "0.4rem",
  },
  btn: {
    padding: "0.3rem 0.65rem",
    fontSize: "0.82rem",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.1s",
  },
};
