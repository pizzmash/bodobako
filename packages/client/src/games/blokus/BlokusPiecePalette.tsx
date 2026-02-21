/**
 * ピースパレット
 * 現在手番の色が持つ 21 ピースをサムネイル形式で表示する。
 * 使用済みピースは淡色・無効化。クリックで選択/解除トグル。
 */

import type { BlokusState } from "@bodobako/shared";
import { PIECES } from "@bodobako/shared";
import { BLOKUS_COLORS, MINI_CELL, MINI_CELL_GAP } from "./constants";
import { PieceThumbnail } from "./PieceThumbnail";
import "./blokus.css";

interface BlokusPiecePaletteProps {
  state: BlokusState;
  colorIndex: number;
  selectedPieceId: number | null;
  isMyTurn: boolean;
  onSelectPiece: (pieceId: number) => void;
}

export function BlokusPiecePalette({
  state,
  colorIndex,
  selectedPieceId,
  isMyTurn,
  onSelectPiece,
}: BlokusPiecePaletteProps) {
  const remaining = state.remainingPieces[colorIndex];
  const colorFill = BLOKUS_COLORS[colorIndex].fill;

  // 残存ピース数カウント
  let remainingCount = 0;
  for (let i = 0; i < 21; i++) {
    if (remaining & (1 << i)) remainingCount++;
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        ピース{" "}
        <span style={styles.count}>残り {remainingCount} 個</span>
      </div>

      <div style={styles.grid}>
        {PIECES.map((piece) => {
          const isUsed = (remaining & (1 << piece.id)) === 0;
          const isSelected = selectedPieceId === piece.id;

          return (
            <button
              key={piece.id}
              className={`blk-palette-item${isSelected ? " blk-palette-selected" : ""}`}
              disabled={!isMyTurn || isUsed}
              onClick={() => onSelectPiece(piece.id)}
              style={{
                ...styles.item,
                opacity: isUsed ? 0.18 : 1,
                background: isSelected ? `${colorFill}20` : "#f9fafb",
                border: isSelected ? `2px solid ${colorFill}` : "2px solid #e5e7eb",
                cursor: isUsed || !isMyTurn ? "default" : "pointer",
              }}
              title={`${piece.size}マス ピース`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <PieceThumbnail
                  variant={piece.variants[0]}
                  color={isUsed ? "#9ca3af" : colorFill}
                  cellSize={MINI_CELL}
                  cellGap={MINI_CELL_GAP}
                />
              </div>
            </button>
          );
        })}
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
  },
  title: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "0.45rem",
  },
  count: {
    fontSize: "0.78rem",
    color: "#9ca3af",
    fontWeight: 400,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "0.22rem",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    aspectRatio: "1",
    minHeight: 34,
    padding: "0.2rem",
    borderRadius: 7,
    transition: "border-color 0.1s",
  },
};
