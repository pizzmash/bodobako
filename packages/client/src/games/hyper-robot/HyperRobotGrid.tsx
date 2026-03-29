import type { Direction, HyperRobotState, Position, RobotColor, TargetMark } from "@bodobako/shared";
import { simulateRobotMove } from "@bodobako/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { BOARD_SIZE, C, ROBOT_COLORS, ROBOT_ICON, TARGET_COLORS } from "./constants";
import { useTargetIconMap } from "./hooks/useTargetIconMap";

interface HyperRobotGridProps {
  state: HyperRobotState;
  selectedRobot: RobotColor | null;
  onSelectRobot?: (color: RobotColor) => void;
  onMoveRobot?: (direction: Direction) => void;
  displayRobots?: Record<RobotColor, Position>;
  isMobile: boolean;
}

const ROBOT_ORDER: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];

export function HyperRobotGrid({
  state,
  selectedRobot,
  onSelectRobot,
  onMoveRobot,
  displayRobots,
  isMobile,
}: HyperRobotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(isMobile ? 18 : 28);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const available = Math.min(rect.width, rect.height);
      const size = Math.max(14, Math.floor((available - 4) / BOARD_SIZE));
      setCellSize(size);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const boardPx = cellSize * BOARD_SIZE;
  const wallThick = Math.max(2, Math.round(cellSize * 0.12));

  // displayRobots があればそちらを使用
  const effectiveRobots = displayRobots ?? state.robots;

  // 全ターゲットのセルマップ
  const targetCellMap = useMemo((): Map<string, TargetMark> => {
    const m = new Map<string, TargetMark>();
    for (const t of state.allTargets) {
      m.set(`${t.position.row},${t.position.col}`, t);
    }
    return m;
  }, [state.allTargets]);

  // ターゲットIDごとのアイコンマップ
  const targetIconMap = useTargetIconMap(state.allTargets);

  // ロボット位置マップ
  const robotAtCell: Record<string, RobotColor> = {};
  for (const color of ROBOT_ORDER) {
    const pos = effectiveRobots[color];
    robotAtCell[`${pos.row},${pos.col}`] = color;
  }

  // 有効な移動方向
  const validDirs = useMemo(() => {
    if (!selectedRobot || !onMoveRobot) return new Set<Direction>();
    const dirs: Direction[] = ["up", "down", "left", "right"];
    return new Set(dirs.filter(d => {
      const newPos = simulateRobotMove(state.robots, state.rightWalls, state.bottomWalls, selectedRobot, d);
      return newPos.row !== state.robots[selectedRobot].row || newPos.col !== state.robots[selectedRobot].col;
    }));
  }, [selectedRobot, state.robots, state.rightWalls, state.bottomWalls, onMoveRobot]);

  const selectedRobotPos = selectedRobot ? (effectiveRobots[selectedRobot] ?? null) : null;

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full"
    >
      <style>{`
        @keyframes hr-target-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes hr-robot-glow {
          0%, 100% { box-shadow: 0 0 6px 2px var(--robot-glow); }
          50% { box-shadow: 0 0 14px 5px var(--robot-glow); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hr-target-pulse, .hr-robot-glow { animation: none !important; }
        }
      `}</style>

      <div
        style={{
          width: boardPx,
          height: boardPx,
          boxSizing: "content-box",
          position: "relative",
          background: C.bgBoard,
          border: `2px solid ${C.wall}`,
          borderRadius: 4,
          flexShrink: 0,
          boxShadow: `0 0 30px rgba(99,102,241,0.15), 0 4px 24px rgba(0,0,0,0.5)`,
          overflow: "visible",
        }}
      >
        {/* グリッドセル */}
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const key = `${row},${col}`;
            const targetMark = targetCellMap.get(key) ?? null;
            const isCurrentTarget = targetMark !== null && state.currentTarget?.id === targetMark.id;
            const TargetIcon = targetMark ? (targetIconMap.get(targetMark.id) ?? null) : null;
            const targetColor = targetMark ? TARGET_COLORS[targetMark.color] : null;
            const robotColor = robotAtCell[key];
            const isOdd = (row + col) % 2 === 1;
            const isSelected = robotColor != null && robotColor === selectedRobot;

            // 目標セルの判定（currentTarget の色と一致するロボット）
            const isTargetRobotHere = robotColor != null && state.currentTarget != null && (
              state.currentTarget.color === "rainbow" || state.currentTarget.color === robotColor
            ) && isCurrentTarget;

            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: col * cellSize,
                  top: row * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: isCurrentTarget
                    ? `rgba(251,191,36,0.13)`
                    : isOdd ? C.bgCellAlt : C.bgCell,
                  boxSizing: "border-box",
                  cursor: robotColor && onSelectRobot ? "pointer" : "default",
                }}
                onClick={() => robotColor && onSelectRobot?.(robotColor)}
              >
                {/* ターゲットマーク */}
                {TargetIcon && targetColor && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: isCurrentTarget ? "hr-target-pulse 1.4s ease-in-out infinite" : undefined,
                      opacity: isCurrentTarget ? 1 : 0.45,
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  >
                    <TargetIcon
                      size={Math.max(8, Math.round(cellSize * 0.55))}
                      color={targetColor}
                      strokeWidth={isCurrentTarget ? 2.2 : 1.5}
                    />
                  </div>
                )}

                {/* 中央2×2オーバーレイ（currentTarget） */}
                {row === 7 && col === 7 && state.currentTarget && (() => {
                  const t = state.currentTarget!;
                  const CenterIcon = targetIconMap.get(t.id) ?? null;
                  const tColor = TARGET_COLORS[t.color];
                  if (!CenterIcon) return null;
                  return (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: cellSize * 2,
                        height: cellSize * 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 2,
                        opacity: 0.35,
                      }}
                    >
                      <CenterIcon
                        size={Math.round(cellSize * 1.2)}
                        color={tColor}
                        strokeWidth={1.5}
                      />
                    </div>
                  );
                })()}

                {/* ロボット */}
                {robotColor && (
                  <div
                    className="hr-robot-glow"
                    style={{
                      position: "absolute",
                      inset: Math.max(1, Math.round(cellSize * 0.08)),
                      borderRadius: "50%",
                      background: `${ROBOT_COLORS[robotColor]}22`,
                      border: isSelected
                        ? `2px solid white`
                        : isTargetRobotHere
                        ? `2px solid ${C.target}`
                        : `1.5px solid ${ROBOT_COLORS[robotColor]}88`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: isTargetRobotHere ? "hr-robot-glow 1.2s ease-in-out infinite" : undefined,
                      // @ts-expect-error CSS custom property
                      "--robot-glow": `${ROBOT_COLORS[robotColor]}88`,
                      transition: "border 0.15s ease",
                      zIndex: 3,
                      cursor: onSelectRobot ? "pointer" : "default",
                    }}
                    onClick={(e) => { e.stopPropagation(); onSelectRobot?.(robotColor); }}
                  >
                    <ROBOT_ICON
                      size={Math.max(8, Math.round(cellSize * 0.6))}
                      color={ROBOT_COLORS[robotColor]}
                      strokeWidth={isTargetRobotHere ? 2.5 : 1.8}
                    />
                    {/* 選択リング */}
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -4,
                          borderRadius: "50%",
                          border: "2px solid white",
                          opacity: 0.7,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* 右壁 */}
                {state.rightWalls[row]?.[col] && (
                  <div
                    style={{
                      position: "absolute",
                      right: -Math.floor(wallThick / 2),
                      top: -Math.floor(wallThick / 2),
                      width: wallThick,
                      height: cellSize + wallThick,
                      background: C.wall,
                      boxShadow: `0 0 4px ${C.wallGlow}`,
                      zIndex: 4,
                    }}
                  />
                )}

                {/* 下壁 */}
                {state.bottomWalls[row]?.[col] && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -Math.floor(wallThick / 2),
                      left: -Math.floor(wallThick / 2),
                      width: cellSize + wallThick,
                      height: wallThick,
                      background: C.wall,
                      boxShadow: `0 0 4px ${C.wallGlow}`,
                      zIndex: 4,
                    }}
                  />
                )}

                {/* グリッドライン */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRight: col < BOARD_SIZE - 1 ? `1px solid ${C.gridLine}` : undefined,
                    borderBottom: row < BOARD_SIZE - 1 ? `1px solid ${C.gridLine}` : undefined,
                    pointerEvents: "none",
                  }}
                />
              </div>
            );
          })
        )}

        {/* 方向矢印オーバーレイ */}
        {selectedRobotPos && onMoveRobot && (
          <>
            {(["up", "down", "left", "right"] as Direction[]).map(dir => {
              if (!validDirs.has(dir)) return null;
              const arrowRow = dir === "up" ? selectedRobotPos.row - 1
                : dir === "down" ? selectedRobotPos.row + 1
                : selectedRobotPos.row;
              const arrowCol = dir === "left" ? selectedRobotPos.col - 1
                : dir === "right" ? selectedRobotPos.col + 1
                : selectedRobotPos.col;
              if (arrowRow < 0 || arrowRow >= BOARD_SIZE || arrowCol < 0 || arrowCol >= BOARD_SIZE) return null;
              const Icon = dir === "up" ? ChevronUp : dir === "down" ? ChevronDown : dir === "left" ? ChevronLeft : ChevronRight;
              const iconSize = Math.max(10, Math.round(cellSize * 0.6));
              return (
                <div
                  key={dir}
                  style={{
                    position: "absolute",
                    left: arrowCol * cellSize,
                    top: arrowRow * cellSize,
                    width: cellSize,
                    height: cellSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10,
                    background: "rgba(99,102,241,0.18)",
                    borderRadius: 4,
                  }}
                  onClick={() => onMoveRobot(dir)}
                >
                  <Icon size={iconSize} color="#818CF8" strokeWidth={2.5} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
