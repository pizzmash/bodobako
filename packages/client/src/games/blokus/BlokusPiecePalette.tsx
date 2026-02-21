/**
 * ピースパレット
 * 自分が担当する色（1〜2色）のピースをサムネイル形式で表示する。
 * 使用済みピースは淡色・無効化。配置不能ピースはグレーアウト＋✕表示。
 * クリックで選択/解除トグル（アクティブカラーのみ）。
 */

import type { BlokusState } from "@bodobako/shared";
import { NUM_PIECES, PIECES, getValidPlacements } from "@bodobako/shared";
import { useMemo } from "react";
import { BLOKUS_COLORS, MINI_CELL, MINI_CELL_GAP, SURFACE, SURFACE_BORDER, TEXT_MUTED, TEXT_PRIMARY } from "./constants";
import { PieceThumbnail } from "./PieceThumbnail";
import "./blokus.css";

interface BlokusPiecePaletteProps {
  state: BlokusState;
  /** 自分が担当する色インデックス（2人戦では2色、それ以外は1色） */
  myColorIndices: number[];
  /** 現在手番の色インデックス */
  activeColorIndex: number;
  selectedPieceId: number | null;
  isMyTurn: boolean;
  onSelectPiece: (pieceId: number) => void;
}

export function BlokusPiecePalette({
  state,
  myColorIndices,
  activeColorIndex,
  selectedPieceId,
  isMyTurn,
  onSelectPiece,
}: BlokusPiecePaletteProps) {
  // 各色の配置不能ピース ID セットを計算（state が変わった時のみ再計算）
  const unplaceableSets = useMemo(() => {
    const result: Record<number, Set<number>> = {};
    for (const ci of myColorIndices) {
      const set = new Set<number>();
      const remaining = state.remainingPieces[ci];
      for (let i = 0; i < NUM_PIECES; i++) {
        if (remaining & (1 << i)) {
          if (getValidPlacements(state, ci, i).length === 0) {
            set.add(i);
          }
        }
      }
      result[ci] = set;
    }
    return result;
  }, [state, myColorIndices]);

  const multiColor = myColorIndices.length > 1;

  return (
    <div style={styles.container}>
      {myColorIndices.map((ci, sectionIdx) => {
        const remaining = state.remainingPieces[ci];
        const colorFill = BLOKUS_COLORS[ci].fill;
        const colorLabel = BLOKUS_COLORS[ci].label;
        const isActiveColor = ci === activeColorIndex;
        const canInteract = isMyTurn && isActiveColor;
        const unplaceable = unplaceableSets[ci] ?? new Set<number>();

        let remainingCount = 0;
        for (let i = 0; i < NUM_PIECES; i++) {
          if (remaining & (1 << i)) remainingCount++;
        }

        return (
          <div
            key={ci}
            style={{
              marginTop: sectionIdx > 0 ? "0.55rem" : 0,
              paddingTop: sectionIdx > 0 ? "0.55rem" : 0,
              borderTop: sectionIdx > 0 ? `1px solid ${SURFACE_BORDER}` : "none",
              opacity: !isActiveColor && isMyTurn ? 0.45 : 1,
              transition: "opacity 0.25s",
            }}
          >
            {/* セクションヘッダー */}
            <div
              style={{
                ...styles.sectionHeader,
                background: isActiveColor && isMyTurn ? `${colorFill}18` : "transparent",
                border: isActiveColor && isMyTurn ? `1px solid ${colorFill}44` : "1px solid transparent",
                borderRadius: 8,
                padding: "3px 6px",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  ...styles.colorSquare,
                  background: colorFill,
                  opacity: state.eliminated[ci] ? 0.4 : 1,
                  boxShadow: isActiveColor && isMyTurn ? `0 0 8px ${colorFill}` : "none",
                }}
              />
              {multiColor && (
                <span style={{ ...styles.colorLabel, color: colorFill }}>
                  {colorLabel}
                </span>
              )}
              {isActiveColor && isMyTurn && (
                <span style={{ ...styles.turnBadge, color: colorFill }}>▶ 手番</span>
              )}
              <span style={styles.headerTitle}>
                <span style={styles.count}>残り {remainingCount} 個</span>
              </span>
            </div>

            {/* ピースグリッド */}
            <div style={styles.grid}>
              {PIECES.map((piece) => {
                const isUsed = (remaining & (1 << piece.id)) === 0;
                const isUnplaceable = !isUsed && unplaceable.has(piece.id);
                const isSelected = canInteract && selectedPieceId === piece.id;
                const isDisabled = !canInteract || isUsed || isUnplaceable;

                let bgColor = "rgba(0,0,0,0.025)";
                let border = `1px solid rgba(0,0,0,0.07)`;
                let opacity = 1;
                let cellColor: string = colorFill;

                if (isSelected) {
                  bgColor = `${colorFill}22`;
                  border = `2px solid ${colorFill}`;
                } else if (isUsed) {
                  opacity = 0.22;
                  cellColor = "#94a3b8";
                } else if (isUnplaceable) {
                  opacity = 0.4;
                  cellColor = "#94a3b8";
                  border = `1px dashed rgba(0,0,0,0.15)`;
                  bgColor = "rgba(0,0,0,0.025)";
                }

                return (
                  <button
                    key={piece.id}
                    className={`blk-palette-item${isSelected ? " blk-palette-selected" : ""}`}
                    disabled={isDisabled}
                    onClick={() => onSelectPiece(piece.id)}
                    style={{
                      ...styles.item,
                      opacity,
                      background: bgColor,
                      border,
                      cursor: isDisabled ? "default" : "pointer",
                      position: "relative",
                    }}
                    title={
                      isUsed
                        ? "使用済み"
                        : isUnplaceable
                          ? "配置できません"
                          : `${piece.size}マス ピース`
                    }
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
                        color={cellColor}
                        cellSize={MINI_CELL}
                        cellGap={MINI_CELL_GAP}
                      />
                    </div>
                    {/* 配置不能バッジ */}
                    {isUnplaceable && (
                      <div style={styles.unplaceableBadge}>✕</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(255,255,255,0.88)",
    borderRadius: 16,
    padding: "0.85rem 0.75rem",
    border: `1px solid rgba(0,0,0,0.07)`,
    backdropFilter: "blur(12px)",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(100,120,180,0.1), 0 1px 4px rgba(0,0,0,0.06)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    transition: "background 0.25s, border-color 0.25s",
  },
  colorSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
    display: "inline-block",
    transition: "box-shadow 0.25s",
  },
  colorLabel: {
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  turnBadge: {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
  headerTitle: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: TEXT_PRIMARY,
    marginLeft: "auto",
    opacity: 0.7,
  },
  count: {
    fontSize: "0.75rem",
    color: TEXT_MUTED,
    fontWeight: 400,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "0.2rem",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    aspectRatio: "1",
    padding: "0.15rem",
    borderRadius: 8,
    transition: "border-color 0.1s, transform 0.14s ease",
    minWidth: 0,
    overflow: "hidden",
  },
  unplaceableBadge: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    color: "#f87171",
    fontWeight: 700,
    pointerEvents: "none",
    background: "rgba(248,113,113,0.1)",
    borderRadius: 6,
  },
};
