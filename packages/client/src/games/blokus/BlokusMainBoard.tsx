/**
 * ブロックス 20×20 メインボード（ガラスボードデザイン）
 *
 * レンダリング戦略:
 *  - 配置済みピース → SVG で描画
 *    - 連結成分(ピース)ごとに feMorphology erode→dilate で外周角丸
 *    - ベベル(上辺ハイライト+下辺シャドウ) + ドロップシャドウもフィルタで統合
 *  - HTMLセル → 透明なインタラクション層（クリック・ホバー・ゴースト）
 */

import React, { useMemo } from "react";
import { Z } from "../../styles/tokens";
import {
  BLOKUS_COLORS,
  BOARD_PADDING,
  CELL_GAP,
  CELL_SIZE,
  CORNER_POSITIONS,
  EMPTY_CELL_COLOR,
  VALID_DOT_COLOR,
} from "./constants";

interface BlokusMainBoardProps {
  grid: number[][];
  selectedPieceId: number | null;
  validCenterSet: Set<string>;
  ghostCells: Set<string>;
  isGhostValid: boolean;
  isMyTurn: boolean;
  activeColorIndex: number;
  lastMoveCells: Set<string>;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  onBoardLeave: () => void;
}

const STEP = CELL_SIZE + CELL_GAP; // 30px
const SVG_SIZE = 20 * STEP - CELL_GAP; // 598px（SVG/グリッドサイズ。ボード外枠サイズは constants.ts の BOARD_PX を参照）

/* ---------- 連結成分抽出 ---------- */

type Rect = { x: number; y: number; w: number; h: number };

interface PieceComponent {
  colorIndex: number;
  rects: Rect[];
}

/** グリッドから連結成分を flood-fill で抽出し、セル+コネクターの rect 一覧を返す */
function extractPieces(grid: number[][]): PieceComponent[] {
  const visited: boolean[][] = Array.from({ length: 20 }, () => Array(20).fill(false));
  const pieces: PieceComponent[] = [];

  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 20; c++) {
      const v = grid[r][c];
      if (v === 0 || visited[r][c]) continue;

      const cells: [number, number][] = [];
      const stack: [number, number][] = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        if (cr < 0 || cr >= 20 || cc < 0 || cc >= 20) continue;
        if (visited[cr][cc] || grid[cr][cc] !== v) continue;
        visited[cr][cc] = true;
        cells.push([cr, cc]);
        stack.push([cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]);
      }

      const cellSet = new Set(cells.map(([cr, cc]) => `${cr},${cc}`));
      const rects: Rect[] = [];
      for (const [cr, cc] of cells) {
        const x = cc * STEP, y = cr * STEP;
        // 隣接方向に rect を STEP まで伸ばして重ねる
        // → 最小幅 CELL_SIZE(28px) なので erode(4) が安全に通る
        const hasRight = cellSet.has(`${cr},${cc + 1}`);
        const hasDown  = cellSet.has(`${cr + 1},${cc}`);
        rects.push({
          x, y,
          w: hasRight ? STEP : CELL_SIZE,
          h: hasDown  ? STEP : CELL_SIZE,
        });
      }

      pieces.push({ colorIndex: v - 1, rects });
    }
  }
  return pieces;
}

/* ---------- SVG ピース描画 ---------- */

const PieceRenderSVG = React.memo(function PieceRenderSVG({ grid }: { grid: number[][] }) {
  const pieces = useMemo(() => extractPieces(grid), [grid]);

  return (
    <svg
      width={SVG_SIZE}
      height={SVG_SIZE}
      className="absolute inset-0 overflow-visible pointer-events-none"
      style={{ zIndex: Z.blkBoardSvg }}
    >
      <defs>
        {BLOKUS_COLORS.map((bc, ci) => (
          <filter key={ci} id={`pf-${ci}`} x="-20%" y="-20%" width="150%" height="160%">
            {/* Step 1: blur + threshold で外周角丸マスクを作成 */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blurred" />
            {/* alpha > ~0.45 → 1, < ~0.45 → 0  (clamp(18*a - 7.5)) */}
            <feColorMatrix in="blurred" type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7.5" result="mask" />

            {/* Step 2: 角丸マスクでソースをクリップ */}
            <feComposite in="SourceGraphic" in2="mask" operator="in" result="src" />

            {/* Step 3: ドロップシャドウ（暗色・下方向 → 浮き上がり感） */}
            <feGaussianBlur in="mask" stdDeviation="4" result="sh-blur" />
            <feOffset in="sh-blur" dx="1" dy="4" result="sh-off" />
            <feFlood floodColor="rgba(30,40,80,1)" floodOpacity="0.35" />
            <feComposite in2="sh-off" operator="in" result="shadow" />

            {/* Step 4: ベベル — 上辺・左辺ハイライト */}
            <feMorphology in="mask" operator="erode" radius="1" result="be" />
            <feOffset in="be" dx="1" dy="2" result="tl" />
            <feComposite in="mask" in2="tl" operator="out" result="tl-e" />
            <feFlood floodColor="white" floodOpacity="0.28" />
            <feComposite in2="tl-e" operator="in" result="light" />

            {/* Step 5: ベベル — 下辺・右辺シャドウ */}
            <feOffset in="be" dx="-1" dy="-2" result="br" />
            <feComposite in="mask" in2="br" operator="out" result="br-e" />
            <feFlood floodColor="black" floodOpacity="0.28" />
            <feComposite in2="br-e" operator="in" result="dark" />

            {/* Step 6: 合成 */}
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="src" />
              <feMergeNode in="light" />
              <feMergeNode in="dark" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {pieces.map((piece, pi) => (
        <g key={`${piece.colorIndex}-${pi}`} filter={`url(#pf-${piece.colorIndex})`}>
          {piece.rects.map(({ x, y, w, h }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={BLOKUS_COLORS[piece.colorIndex].fill} />
          ))}
        </g>
      ))}
    </svg>
  );
});

/* ---------- メインコンポーネント ---------- */

export const BlokusMainBoard = React.memo(function BlokusMainBoard({
  grid,
  selectedPieceId,
  validCenterSet,
  ghostCells,
  isGhostValid,
  isMyTurn,
  activeColorIndex,
  lastMoveCells,
  onCellClick,
  onCellHover,
  onBoardLeave,
}: BlokusMainBoardProps) {
  const ghostFill = BLOKUS_COLORS[activeColorIndex]?.fill ?? BLOKUS_COLORS[0].fill;

  return (
    <div
      className="blk-main-board inline-flex select-none"
      style={{ padding: BOARD_PADDING }}
      onMouseLeave={onBoardLeave}
    >
      <div
        className="relative"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(20, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(20, ${CELL_SIZE}px)`,
          gap: CELL_GAP,
          background: "rgba(120,145,185,0.22)",
        }}
      >
        <PieceRenderSVG grid={grid} />

        {Array.from({ length: 20 }, (_, row) =>
          Array.from({ length: 20 }, (_, col) => {
            const colorVal = grid[row][col];
            const cellKey = `${row},${col}`;
            const isGhost = ghostCells.has(cellKey);
            const isValidCenter = validCenterSet.has(cellKey);
            const isPlaced = colorVal > 0;

            const isLastMove = lastMoveCells.has(cellKey);

            const cornerColorIndex = CORNER_POSITIONS.findIndex(
              ([cr, cc]) => cr === row && cc === col,
            );
            const isCorner = cornerColorIndex !== -1 && !isPlaced;

            const cellClassName =
              isValidCenter && isMyTurn && selectedPieceId !== null
                ? "blk-cell-valid"
                : undefined;

            return (
              <div
                key={cellKey}
                className={cellClassName}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  position: "relative",
                  flexShrink: 0,
                  zIndex: Z.blkBoardCell,
                  cursor:
                    isValidCenter && isMyTurn && selectedPieceId !== null
                      ? "pointer"
                      : "default",
                }}
                onClick={() => onCellClick(row, col)}
                onMouseEnter={() => onCellHover(row, col)}
              >
                {/* 空セル背景 */}
                {!isPlaced && !isGhost && (
                  <div
                    className="absolute inset-0 rounded-[4px]"
                    style={{
                      background: EMPTY_CELL_COLOR,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  />
                )}

                {/* ゴーストオーバーレイ（配置プレビュー） */}
                {isGhost && (
                  <div
                    className="absolute inset-0 rounded-[4px] pointer-events-none"
                    style={{
                      background: isGhostValid ? ghostFill : "rgba(120,130,150,0.55)",
                      opacity: 0.5,
                      boxShadow: isGhostValid
                        ? `0 0 0 1.5px ${ghostFill}88, inset 0 1px 0 rgba(255,255,255,0.35)`
                        : "inset 0 1px 0 rgba(255,255,255,0.15)",
                      zIndex: Z.blkCellOverlay,
                    }}
                  />
                )}

                {/* 有効センタードット */}
                {isValidCenter && !isGhost && selectedPieceId !== null && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 6,
                      height: 6,
                      background: VALID_DOT_COLOR,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: Z.blkCellOverlay,
                    }}
                  />
                )}

                {/* 直近配置ピースのぴかぴかオーバーレイ */}
                {isLastMove && isPlaced && (
                  <div className="blk-cell-last-piece" />
                )}

                {/* スタートコーナーマーカー */}
                {isCorner && !isGhost && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 7,
                      height: 7,
                      background: BLOKUS_COLORS[cornerColorIndex].fill,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      opacity: 0.65,
                      zIndex: Z.blkCellOverlay,
                    }}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
});

