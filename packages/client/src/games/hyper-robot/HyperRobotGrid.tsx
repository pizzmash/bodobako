import type { Direction, HyperRobotState, Position, RobotColor, TargetMark } from "@bodobako/shared";
import { simulateRobotMove } from "@bodobako/shared";
import type { LucideIcon } from "lucide-react";
import { Bot, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_SIZE, C, RAINBOW_COIN_BG, ROBOT_COLORS, TARGET_COLORS } from "./constants";

interface HyperRobotGridProps {
  state: HyperRobotState;
  selectedRobot: RobotColor | null;
  onSelectRobot?: (color: RobotColor) => void;
  onMoveRobot?: (direction: Direction) => void;
  displayRobots?: Record<RobotColor, Position>;
  isMobile: boolean;
  targetIconMap: Map<number, LucideIcon>;
}

const ROBOT_ORDER: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];

export function HyperRobotGrid({
  state,
  selectedRobot,
  onSelectRobot,
  onMoveRobot,
  displayRobots,
  isMobile,
  targetIconMap,
}: HyperRobotGridProps) {
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const robotInset = Math.max(1, Math.round(cellSize * 0.07));
  const robotSize = cellSize - robotInset * 2;

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
  // (targetIconMap は props 経由で受け取る)

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
  const targetPos = state.currentTarget?.position ?? null;

  // 中央チップトレイのサイズ
  const trayCellSize = cellSize * 2;
  const coinSize = Math.round(cellSize * 1.45);

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
          0%, 100% { box-shadow: 0 3px 9px rgba(0,0,0,0.6), 0 0 8px 2px var(--robot-glow); }
          50%       { box-shadow: 0 3px 9px rgba(0,0,0,0.6), 0 0 20px 7px var(--robot-glow); }
        }
        @keyframes hr-coin-pulse {
          0%, 100% { opacity: 0.9; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hr-target-pulse, .hr-robot-glow, .hr-coin-pulse { animation: none !important; }
        }
      `}</style>

      <div
        style={{
          width: boardPx,
          height: boardPx,
          boxSizing: "content-box",
          position: "relative",
          background: `radial-gradient(ellipse at 50% 50%, #1e2358 0%, #181c3e 28%, #131630 56%, #0e1022 100%)`,
          border: `2px solid rgba(148,160,255,0.75)`,
          borderRadius: 4,
          flexShrink: 0,
          boxShadow: [
            "0 0 8px 3px rgba(148,160,255,0.70)",
            "0 0 22px 6px rgba(99,102,241,0.55)",
            "0 0 70px rgba(99,102,241,0.32)",
            "0 0 140px rgba(99,102,241,0.15)",
            "0 14px 55px rgba(0,0,0,0.88)",
            "inset 0 0 110px rgba(99,102,241,0.08)",
          ].join(", "),
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
            const isOdd = (row + col) % 2 === 1;
            // 中央4セルはチップトレイで覆う
            const isCenter = (row === 7 || row === 8) && (col === 7 || col === 8);

            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: col * cellSize,
                  top: row * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: isCenter
                    ? "transparent"
                    : isCurrentTarget
                    ? `radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.24) 0%, rgba(251,191,36,0.09) 55%, transparent 100%)`
                    : isOdd
                    ? "rgba(28,33,72,0.92)"
                    : "rgba(20,24,56,0.92)",
                  boxSizing: "border-box",
                }}
              >
                {/* ターゲットマーク（中央以外） */}
                {TargetIcon && targetColor && !isCenter && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: (isCurrentTarget && !prefersReducedMotion) ? "hr-target-pulse 1.4s ease-in-out infinite" : undefined,
                      opacity: isCurrentTarget ? 1 : 0.72,
                      pointerEvents: "none",
                      zIndex: 1,
                      filter: isCurrentTarget
                        ? `drop-shadow(0 0 5px ${targetColor}) drop-shadow(0 0 12px ${targetColor}bb)`
                        : `drop-shadow(0 0 4px ${targetColor}cc) drop-shadow(0 0 9px ${targetColor}88)`,
                      strokeWidth: isCurrentTarget ? 2.2 : 1.8,
                    }}
                  >
                    <TargetIcon
                      size={Math.max(8, Math.round(cellSize * 0.55))}
                      color={targetColor}
                      strokeWidth={isCurrentTarget ? 2.2 : 1.5}
                    />
                  </div>
                )}

                {/* 右壁 */}
                {state.rightWalls[row]?.[col] && (
                  <div
                    style={{
                      position: "absolute",
                      right: -Math.floor(wallThick / 2) - 1,
                      top: -Math.floor(wallThick / 2),
                      width: wallThick + 2,
                      height: cellSize + wallThick,
                      background: `linear-gradient(90deg,
                        rgba(99,102,241,0) 0%,
                        rgba(148,160,255,0.72) 28%,
                        rgba(218,224,255,0.98) 50%,
                        rgba(148,160,255,0.72) 72%,
                        rgba(99,102,241,0) 100%)`,
                      boxShadow: [
                        `-4px 0 8px rgba(99,102,241,0.40)`,
                        `4px 0 8px rgba(99,102,241,0.40)`,
                        `0 0 14px rgba(129,140,248,0.55)`,
                      ].join(", "),
                      zIndex: 4,
                    }}
                  />
                )}

                {/* 下壁 */}
                {state.bottomWalls[row]?.[col] && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -Math.floor(wallThick / 2) - 1,
                      left: -Math.floor(wallThick / 2),
                      width: cellSize + wallThick,
                      height: wallThick + 2,
                      background: `linear-gradient(180deg,
                        rgba(99,102,241,0) 0%,
                        rgba(148,160,255,0.72) 28%,
                        rgba(218,224,255,0.98) 50%,
                        rgba(148,160,255,0.72) 72%,
                        rgba(99,102,241,0) 100%)`,
                      boxShadow: [
                        `0 -4px 8px rgba(99,102,241,0.40)`,
                        `0 4px 8px rgba(99,102,241,0.40)`,
                        `0 0 14px rgba(129,140,248,0.55)`,
                      ].join(", "),
                      zIndex: 4,
                    }}
                  />
                )}


              </div>
            );
          })
        )}

        {/* エネルギーグリッドオーバーレイ */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              `linear-gradient(rgba(60,72,168,0.40) 1px, transparent 1px)`,
              `linear-gradient(90deg, rgba(60,72,168,0.40) 1px, transparent 1px)`,
            ].join(", "),
            backgroundSize: `${cellSize}px ${cellSize}px`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* 中央コアグロー */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.06) 38%, transparent 62%)`,
            pointerEvents: "none",
            zIndex: 3,
          }}
        />

        {/* 中央チップトレイ */}
        {(() => {
          const t = state.currentTarget;
          const tColor = t ? TARGET_COLORS[t.color] : C.muted;
          const TrayIcon = t ? (targetIconMap.get(t.id) ?? null) : null;

          return (
            <div
              style={{
                position: "absolute",
                left: 7 * cellSize,
                top: 7 * cellSize,
                width: trayCellSize,
                height: trayCellSize,
                zIndex: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(ellipse at 50% 35%, #1c1c38, #0b0b17)",
                border: `1px solid ${t ? tColor + "33" : "rgba(255,255,255,0.06)"}`,
                boxShadow: [
                  "inset 0 4px 14px rgba(0,0,0,0.92)",
                  "inset 0 -1px 4px rgba(255,255,255,0.03)",
                  t ? `0 0 18px ${tColor}22` : "none",
                ].join(", "),
                borderRadius: 6,
                pointerEvents: "none",
              }}
            >
              {/* 外枠装飾ライン */}
              <div
                style={{
                  position: "absolute",
                  inset: 3,
                  borderRadius: 4,
                  border: `1px solid ${t ? tColor + "18" : "rgba(255,255,255,0.04)"}`,
                  pointerEvents: "none",
                }}
              />

              {/* 凹んだスロット */}
              <div
                style={{
                  width: coinSize + 12,
                  height: coinSize + 12,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.65)",
                  boxShadow: [
                    "inset 0 4px 12px rgba(0,0,0,0.95)",
                    "inset 0 2px 6px rgba(0,0,0,0.7)",
                    "inset 0 0 0 1px rgba(0,0,0,0.5)",
                  ].join(", "),
                  border: "1px solid rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {TrayIcon && t ? (
                  /* コイン（rainbow のみレインボー、他はターゲット色） */
                  <div
                    style={{
                      width: coinSize,
                      height: coinSize,
                      borderRadius: "50%",
                      background: t.color === "rainbow"
                        ? RAINBOW_COIN_BG
                        : `radial-gradient(circle at 36% 30%, ${tColor}ff, ${tColor}cc 40%, ${tColor}88 65%, ${tColor}44)`,
                      boxShadow: t.color === "rainbow"
                        ? [
                            "0 5px 18px rgba(0,0,0,0.7)",
                            "inset 0 3px 8px rgba(255,255,255,0.38)",
                            "inset 0 -3px 6px rgba(0,0,0,0.28)",
                            "0 0 28px rgba(255,255,255,0.12)",
                          ].join(", ")
                        : [
                            `0 5px 16px rgba(0,0,0,0.7)`,
                            "inset 0 3px 7px rgba(255,255,255,0.28)",
                            "inset 0 -2px 5px rgba(0,0,0,0.5)",
                            `0 0 24px ${tColor}55`,
                          ].join(", "),
                      border: t.color === "rainbow"
                        ? "2px solid rgba(255,255,255,0.55)"
                        : `2px solid ${tColor}bb`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      animation: !prefersReducedMotion ? "hr-coin-pulse 1.6s ease-in-out infinite" : undefined,
                    }}
                  >
                    {/* 内側エンボスリング */}
                    <div
                      style={{
                        position: "absolute",
                        inset: Math.round(coinSize * 0.13),
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.28)",
                        pointerEvents: "none",
                      }}
                    />
                    {/* 彫刻アイコン */}
                    <TrayIcon
                      size={Math.round(coinSize * 0.38)}
                      color="rgba(0,0,0,0.65)"
                      strokeWidth={2.5}
                    />
                    {/* スペキュラハイライト */}
                    <div
                      style={{
                        position: "absolute",
                        top: "11%",
                        left: "16%",
                        width: "35%",
                        height: "24%",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.48)",
                        transform: "rotate(-22deg)",
                        pointerEvents: "none",
                      }}
                    />
                    {/* 下部影 */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "13%",
                        right: "17%",
                        width: "30%",
                        height: "16%",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.18)",
                        transform: "rotate(-22deg)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                ) : (
                  /* 空スロット */
                  <div
                    style={{
                      width: Math.round(coinSize * 0.65),
                      height: Math.round(coinSize * 0.65),
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px dashed rgba(255,255,255,0.09)",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* ロボットレイヤー — transform トランジションでスムーズ移動 */}
        {ROBOT_ORDER.map(color => {
          const pos = effectiveRobots[color];
          const isSelected = color === selectedRobot;
          const isAtTarget =
            !displayRobots &&
            targetPos != null &&
            pos.row === targetPos.row &&
            pos.col === targetPos.col &&
            state.currentTarget != null &&
            (state.currentTarget.color === "rainbow" || state.currentTarget.color === color);
          const robotColorHex = ROBOT_COLORS[color];

          return (
            <div
              key={color}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: cellSize,
                height: cellSize,
                transform: `translate(${pos.col * cellSize}px, ${pos.row * cellSize}px)`,
                transition: "transform 0.26s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                willChange: "transform",
                zIndex: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: onSelectRobot ? "pointer" : "default",
                pointerEvents: onSelectRobot ? "auto" : "none",
              }}
              onClick={() => onSelectRobot?.(color)}
            >
              <div
                className={isAtTarget ? "hr-robot-glow" : ""}
                style={{
                  width: robotSize,
                  height: robotSize,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 38% 32%, ${robotColorHex}2e, ${robotColorHex}12 55%, transparent)`,
                  border: isSelected
                    ? `2px solid rgba(255,255,255,0.88)`
                    : isAtTarget
                    ? `2px solid ${C.target}`
                    : `1.5px solid ${robotColorHex}80`,
                  boxShadow: isSelected
                    ? [
                        `0 0 0 2.5px rgba(255,255,255,0.3)`,
                        `0 4px 12px rgba(0,0,0,0.65)`,
                        `0 0 14px ${robotColorHex}55`,
                      ].join(", ")
                    : [
                        `0 3px 9px rgba(0,0,0,0.6)`,
                        `0 0 10px ${robotColorHex}45`,
                        `inset 0 0 8px ${robotColorHex}15`,
                      ].join(", "),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  transition: "border 0.15s ease",
                  // @ts-expect-error CSS custom property
                  "--robot-glow": `${robotColorHex}90`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    filter: isAtTarget
                      ? `drop-shadow(0 0 6px ${robotColorHex}) drop-shadow(0 0 14px ${robotColorHex}bb)`
                      : isSelected
                      ? `drop-shadow(0 0 5px ${robotColorHex}dd) drop-shadow(0 0 10px ${robotColorHex}88)`
                      : `drop-shadow(0 0 4px ${robotColorHex}99)`,
                  }}
                >
                  <Bot
                    size={Math.max(7, Math.round(cellSize * 0.5))}
                    color={robotColorHex}
                    strokeWidth={isAtTarget ? 2.2 : 1.8}
                  />
                </div>
                {/* 選択リング */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -5,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.6)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

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
                    background: "rgba(99,102,241,0.22)",
                    borderRadius: 4,
                    border: "1px solid rgba(99,102,241,0.38)",
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
