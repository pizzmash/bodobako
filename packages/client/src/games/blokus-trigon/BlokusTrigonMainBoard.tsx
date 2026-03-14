/**
 * ブロックストライゴン — SVG メインボード
 *
 * 18×35 の三角グリッドを SVG polygon で描画する。
 * - 配置済みセル → 色付き三角
 * - ゴースト → 半透明三角
 * - 有効センター → ドット
 * - スタートマーカー → 色付きドット
 */

import { GRID_COLS, GRID_ROWS, isTrigonBorderCell, isValidCell, START_POSITIONS, START_POSITIONS_3P } from "@bodobako/shared";
import React, { useCallback, useMemo, useRef } from "react";
import {
    BOARD_SVG_HEIGHT,
    BOARD_SVG_WIDTH,
    EMPTY_CELL_COLOR,
    TRIGON_COLORS,
    VALID_DOT_COLOR
} from "./constants";
import { svgToCell, triCenter, triPoints } from "./triUtil";

interface Props {
  grid: number[][];
  selectedPieceId: number | null;
  validCenterSet: Set<string>;
  ghostCells: Set<string>;
  isGhostValid: boolean;
  isMyTurn: boolean;
  activeColorIndex: number;
  lastMoveCells: Set<string>;
  numColors: number;
  borderRestriction: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number) => void;
  onBoardLeave: () => void;
}

export const BlokusTrigonMainBoard = React.memo(function BlokusTrigonMainBoard({
  grid,
  selectedPieceId,
  validCenterSet,
  ghostCells,
  isGhostValid,
  isMyTurn,
  activeColorIndex,
  lastMoveCells,
  numColors,
  borderRestriction,
  onCellClick,
  onCellHover,
  onBoardLeave,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ghostFill =
    TRIGON_COLORS[activeColorIndex]?.fill ?? TRIGON_COLORS[0].fill;

  // SVGイベント座標 → セル座標変換
  const getSvgCoords = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());
      return svgToCell(svgPt.x, svgPt.y);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const cell = getSvgCoords(e);
      if (cell) {
        onCellHover(cell.row, cell.col);
      }
    },
    [getSvgCoords, onCellHover],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const cell = getSvgCoords(e);
      if (cell) {
        onCellClick(cell.row, cell.col);
      }
    },
    [getSvgCoords, onCellClick],
  );

  // 全有効セルの (row, col) を列挙
  const validCells = useMemo(() => {
    const cells: [number, number][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (isValidCell(r, c)) {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }, []);

  // スタート位置（使用色数に応じて）
  const startPositions = useMemo(
    () => (numColors === 3 ? START_POSITIONS_3P : START_POSITIONS).slice(0, numColors),
    [numColors],
  );

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${BOARD_SVG_WIDTH} ${BOARD_SVG_HEIGHT}`}
      className="select-none"
      style={{
        maxWidth: BOARD_SVG_WIDTH,
        cursor:
          isMyTurn && selectedPieceId !== null ? "pointer" : "default",
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={onBoardLeave}
    >
      {/* 背景 */}
      <rect
        x={0}
        y={0}
        width={BOARD_SVG_WIDTH}
        height={BOARD_SVG_HEIGHT}
        rx={10}
        fill="rgba(120,145,185,0.12)"
      />

      {/* 空セル */}
      {validCells.map(([r, c]) => {
        const colorVal = grid[r][c];
        const key = `${r},${c}`;

        if (colorVal > 0) return null; // 配置済みはあとで
        if (ghostCells.has(key)) return null; // ゴーストは別レイヤ

        const isBorder = borderRestriction && isTrigonBorderCell(r, c);
        return (
          <polygon
            key={key}
            points={triPoints(r, c)}
            fill={isBorder ? "rgba(180,180,195,0.45)" : EMPTY_CELL_COLOR}
            stroke="rgba(160,175,200,0.3)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* 配置済みセル */}
      {validCells.map(([r, c]) => {
        const colorVal = grid[r][c];
        if (colorVal <= 0) return null;

        const key = `${r},${c}`;
        const color = TRIGON_COLORS[colorVal - 1]?.fill ?? "#888";
        const isLast = lastMoveCells.has(key);

        return (
          <polygon
            key={key}
            points={triPoints(r, c)}
            fill={color}
            stroke={color}
            strokeWidth={0.8}
            strokeLinejoin="round"
            opacity={isLast ? undefined : 1}
            className={isLast ? "bkt-last-piece" : undefined}
          />
        );
      })}

      {/* ゴーストオーバーレイ */}
      {Array.from(ghostCells).map((key) => {
        const [rStr, cStr] = key.split(",");
        const r = Number(rStr);
        const c = Number(cStr);
        if (!isValidCell(r, c)) return null;

        return (
          <polygon
            key={`ghost-${key}`}
            points={triPoints(r, c)}
            fill={isGhostValid ? ghostFill : "rgba(120,130,150,0.55)"}
            opacity={0.5}
            stroke={isGhostValid ? ghostFill : "rgba(120,130,150,0.4)"}
            strokeWidth={1}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      })}

      {/* 有効センタードット */}
      {selectedPieceId !== null &&
        Array.from(validCenterSet).map((key) => {
          const [rStr, cStr] = key.split(",");
          const r = Number(rStr);
          const c = Number(cStr);
          const { cx, cy } = triCenter(r, c);

          return (
            <circle
              key={`dot-${key}`}
              cx={cx}
              cy={cy}
              r={2.5}
              fill={VALID_DOT_COLOR}
              pointerEvents="none"
            />
          );
        })}

      {/* スタートマーカー */}
      {startPositions.map(([r, c], ci) => {
        if (grid[r][c] > 0) return null; // 既に配置済み
        const { cx, cy } = triCenter(r, c);
        const color = TRIGON_COLORS[ci]?.fill ?? "#888";
        return (
          <circle
            key={`start-${ci}`}
            cx={cx}
            cy={cy}
            r={3}
            fill={color}
            opacity={0.65}
            pointerEvents="none"
          />
        );
      })}
    </svg>
  );
});
