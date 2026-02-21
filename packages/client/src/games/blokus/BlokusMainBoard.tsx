/**
 * ブロックス 20×20 メインボード
 *
 * 各セルの表示優先順:
 *  1. ゴーストオーバーレイ（選択ピースのプレビュー）: 有効→半透明色、無効→半透明赤
 *  2. 配置可能センタードット（ゴーストなし時）
 *  3. スタートコーナーマーカー（空セルのみ）
 *  4. 配置済みピースカラー / 空セルグレー
 */

import {
  BLOKUS_COLORS,
  BOARD_BG,
  BOARD_LINE_COLOR,
  CELL_SIZE,
  CORNER_POSITIONS,
  EMPTY_CELL_COLOR,
  GHOST_INVALID_BG,
  GHOST_VALID_BG,
  VALID_DOT_COLOR,
} from "./constants";
import "./blokus.css";

interface BlokusMainBoardProps {
  grid: number[][];
  selectedPieceId: number | null;
  validCenterSet: Set<string>;
  ghostCells: Set<string>;
  isGhostValid: boolean;
  isMyTurn: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  onBoardLeave: () => void;
}

export function BlokusMainBoard({
  grid,
  selectedPieceId,
  validCenterSet,
  ghostCells,
  isGhostValid,
  isMyTurn,
  onCellClick,
  onCellHover,
  onBoardLeave,
}: BlokusMainBoardProps) {
  return (
    <div style={styles.board} onMouseLeave={onBoardLeave}>
      {Array.from({ length: 20 }, (_, row) => (
        <div key={row} style={styles.row}>
          {Array.from({ length: 20 }, (_, col) => {
            const colorVal = grid[row][col]; // 0=空, 1-4=色+1
            const cellKey = `${row},${col}`;
            const isGhost = ghostCells.has(cellKey);
            const isValidCenter = validCenterSet.has(cellKey);

            // スタートコーナー判定
            const cornerColorIndex = CORNER_POSITIONS.findIndex(
              ([cr, cc]) => cr === row && cc === col,
            );
            const isCorner = cornerColorIndex !== -1 && colorVal === 0;

            // 背景色
            const bg = colorVal > 0 ? BLOKUS_COLORS[colorVal - 1].fill : EMPTY_CELL_COLOR;

            // ホバーエフェクトクラス（有効センターセルのみ）
            const className =
              isValidCenter && isMyTurn && selectedPieceId !== null
                ? "blk-cell-valid"
                : undefined;

            return (
              <div
                key={col}
                className={className}
                style={{
                  ...styles.cell,
                  background: bg,
                  cursor:
                    isValidCenter && isMyTurn && selectedPieceId !== null ? "pointer" : "default",
                }}
                onClick={() => onCellClick(row, col)}
                onMouseEnter={() => onCellHover(row, col)}
              >
                {/* ゴーストオーバーレイ */}
                {isGhost && (
                  <div
                    style={{
                      ...styles.overlay,
                      background: isGhostValid ? GHOST_VALID_BG : GHOST_INVALID_BG,
                    }}
                  />
                )}

                {/* 有効センタードット（ゴーストがない時のみ表示） */}
                {isValidCenter && !isGhost && selectedPieceId !== null && (
                  <div style={styles.validDot} />
                )}

                {/* スタートコーナーマーカー */}
                {isCorner && !isGhost && (
                  <div
                    style={{
                      ...styles.cornerDot,
                      background: BLOKUS_COLORS[cornerColorIndex].fill,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  board: {
    display: "flex",
    flexDirection: "column",
    border: "2px solid #374151",
    borderRadius: 4,
    background: BOARD_BG,
    userSelect: "none",
  },
  row: {
    display: "flex",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    border: `0.5px solid ${BOARD_LINE_COLOR}`,
    position: "relative",
    flexShrink: 0,
    boxSizing: "border-box",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  validDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: VALID_DOT_COLOR,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  cornerDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    opacity: 0.75,
  },
};
