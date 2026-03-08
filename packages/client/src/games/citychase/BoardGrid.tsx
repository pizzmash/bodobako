import type {
    BuildingPos,
    CitychasePlayerView,
    IntersectionPos,
} from "@bodobako/shared";
import {
    CITYCHASE_BOARD_SIZE as BOARD_SIZE,
    INTERSECTION_SIZE,
    isSamePos,
    posKey,
} from "@bodobako/shared";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HELI_COLORS } from "./constants";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  onBuildingClick?: (pos: BuildingPos) => void;
  onIntersectionClick?: (pos: IntersectionPos) => void;
  highlightBuildings?: BuildingPos[];
  highlightIntersections?: IntersectionPos[];
  activeHelicopterIndex?: number;
  searchableBuildings?: BuildingPos[];
}

// レイアウト定数
const CELL = 52;
const GAP = 30;
const TOTAL = CELL + GAP;
const PAD = 14;
const GRID_SIZE = BOARD_SIZE * CELL + (BOARD_SIZE - 1) * GAP + PAD * 2;


export function BoardGrid({
  state,
  playerId,
  onBuildingClick,
  onIntersectionClick,
  highlightBuildings = [],
  highlightIntersections = [],
  activeHelicopterIndex,
  searchableBuildings = [],
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setScale(Math.min(1, el.clientWidth / GRID_SIZE));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const traceInfoMap = useMemo(
    () => new Map(state.revealedTraces.map((t) => [posKey(t.pos), t])),
    [state.revealedTraces]
  );
  const searchedEmptySet = useMemo(
    () => new Set(state.searchedEmpty.map(posKey)),
    [state.searchedEmpty]
  );
  const highlightBuildingSet = useMemo(
    () => new Set(highlightBuildings.map(posKey)),
    [highlightBuildings]
  );
  const searchableBuildingSet = useMemo(
    () => new Set(searchableBuildings.map(posKey)),
    [searchableBuildings]
  );
  const highlightIntersectionSet = useMemo(
    () => new Set(highlightIntersections.map(posKey)),
    [highlightIntersections]
  );
  const helicopterMap = useMemo(() => {
    const map = new Map<string, number>();
    state.helicopters.forEach((h, i) => { if (h) map.set(posKey(h), i); });
    return map;
  }, [state.helicopters]);

  const getTraceInfo = (pos: BuildingPos) => traceInfoMap.get(posKey(pos));
  const isSearchedEmpty = (pos: BuildingPos) => searchedEmptySet.has(posKey(pos));
  const isHighlightedBuilding = (pos: BuildingPos) => highlightBuildingSet.has(posKey(pos));
  const isSearchableBuilding = (pos: BuildingPos) => searchableBuildingSet.has(posKey(pos));
  const isHighlightedIntersection = (pos: IntersectionPos) => highlightIntersectionSet.has(posKey(pos));
  const getHelicopterAt = (pos: IntersectionPos) => helicopterMap.get(posKey(pos)) ?? -1;

  const hasTraces = Object.keys(state.traces).length > 0;

  const hasCriminalTrace = (pos: BuildingPos) =>
    hasTraces && posKey(pos) in state.traces;

  const getCriminalTraceRound = (pos: BuildingPos) =>
    hasTraces ? state.traces[posKey(pos)] ?? null : null;

  return (
    <div ref={wrapperRef} style={{ width: "100%" }}>
    <div
      style={{
        width: GRID_SIZE * scale,
        height: GRID_SIZE * scale,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
    <div
      style={{
        position: "relative",
        width: GRID_SIZE,
        height: GRID_SIZE,
        background: "radial-gradient(circle at center, rgba(37, 140, 244, 0.08), rgba(16, 25, 34, 0.95))",
        borderRadius: 12,
        boxShadow: "inset 0 2px 12px rgba(0,0,0,.5), 0 4px 24px rgba(0,0,0,.3)",
        border: "1px solid rgba(37, 140, 244, 0.2)",
        transform: scale < 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
      }}
    >
      {/*
        道路レイアウト:
        ■|■
        -●-
        ■|■
        縦道(|) = 同じ行の隣接ビル間（列ギャップ）を縦に走る
        横道(-) = 同じ列の隣接ビル間（行ギャップ）を横に走る
      */}

      {/* 縦道 (|): 列ギャップ内、ビル高さ分の縦線 */}
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE - 1 }, (_, colGap) => (
          <div
            key={`vr-${row}-${colGap}`}
            style={{
              position: "absolute",
              left: PAD + colGap * TOTAL + CELL + GAP / 2 - 2,
              top: PAD + row * TOTAL,
              width: 4,
              height: CELL,
              background: "rgba(37, 140, 244, 0.15)",
              borderRadius: 2,
              boxShadow: "0 0 4px rgba(37, 140, 244, 0.2)",
            }}
          />
        ))
      )}

      {/* 横道 (-): 行ギャップ内、ビル幅分の横線 */}
      {Array.from({ length: BOARD_SIZE - 1 }, (_, rowGap) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => (
          <div
            key={`hr-${rowGap}-${col}`}
            style={{
              position: "absolute",
              left: PAD + col * TOTAL,
              top: PAD + rowGap * TOTAL + CELL + GAP / 2 - 2,
              width: CELL,
              height: 4,
              background: "rgba(37, 140, 244, 0.15)",
              borderRadius: 2,
              boxShadow: "0 0 4px rgba(37, 140, 244, 0.2)",
            }}
          />
        ))
      )}

      {/* ビル (5×5) */}
      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
          const pos: BuildingPos = { row, col };
          const trace = getTraceInfo(pos);
          const searched = isSearchedEmpty(pos);
          const highlighted = isHighlightedBuilding(pos);
          const searchable = isSearchableBuilding(pos);
          const isCriminalHere =
            state.criminalPos && isSamePos(state.criminalPos, pos);
          const criminalTrace = hasCriminalTrace(pos);
          const criminalRound = getCriminalTraceRound(pos);
          const clickable =
            !!onBuildingClick &&
            (highlighted || searchable || state.phase === "criminal-setup");

          // ビル本来の見た目を決定（ハイライトでは上書きしない）
          let bg: string;
          let borderColor: string;
          let label = "";
          let labelColor = "white";
          let glowColor = "";

          if (isCriminalHere) {
            bg = "linear-gradient(135deg, #dc2626, #991b1b)";
            borderColor = "#7f1d1d";
            label = "T";
            labelColor = "#ffffff";
            glowColor = "rgba(220, 38, 38, 0.4)";
          } else if (trace) {
            bg = "linear-gradient(135deg, rgba(217, 119, 6, 0.5), rgba(161, 98, 7, 0.6))";
            borderColor = "#d97706";
            label = trace.round !== null ? `R${trace.round}` : "!";
            labelColor = "#fbbf24";
            glowColor = "rgba(217, 119, 6, 0.4)";
          } else if (criminalTrace) {
            bg = "linear-gradient(135deg, rgba(185, 28, 28, 0.4), rgba(127, 29, 29, 0.5))";
            borderColor = "#991b1b";
            label = criminalRound === 1 || criminalRound === 6 ? `R${criminalRound}` : "···";
            labelColor = "#fca5a5";
            glowColor = "rgba(185, 28, 28, 0.3)";
          } else {
            // 通常ビル（ダークテーマ）
            bg = "linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.5))";
            borderColor = "rgba(37, 140, 244, 0.15)";
            glowColor = "";
          }

          // ハイライトアニメーション（色は上書きせず枠の光で表現）
          const animationClass = isCriminalHere
            ? "animate-cc-criminal-glow"
            : highlighted
              ? "animate-cc-highlight-green"
              : searchable
                ? "animate-cc-highlight-amber"
                : "";

          return (
            <div
              key={`b-${row}-${col}`}
              className={clsx(clickable && "cc-building-clickable", animationClass) || undefined}
              onClick={() => clickable && onBuildingClick?.(pos)}
              style={{
                position: "absolute",
                left: PAD + col * TOTAL,
                top: PAD + row * TOTAL,
                width: CELL,
                height: CELL,
                background: bg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: label.length > 2 ? "0.5rem" : label.startsWith("R") ? "0.8rem" : "1.1rem",
                color: labelColor,
                fontWeight: label === "T" ? 900 : label.startsWith("R") ? 900 : 800,
                fontFamily: label === "T" || label === "!" ? "'Orbitron', monospace" : "monospace",
                letterSpacing: label === "···" ? "0.05em" : "0.02em",
                border: `2px solid ${borderColor}`,
                transition: "transform 0.12s, filter 0.12s",
                userSelect: "none",
                boxShadow: glowColor
                  ? `0 2px 10px ${glowColor}, 0 0 15px ${glowColor}, inset 0 1px 2px rgba(255,255,255,.08)`
                  : "0 2px 6px rgba(0,0,0,.3), inset 0 1px 2px rgba(255,255,255,.05)",
                backdropFilter: "blur(4px)",
              }}
            >
              {label}
              {/* 捜索済みバッジ（左上に小さくチェック） */}
              {searched && !isCriminalHere && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 2,
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: "rgba(16, 25, 34, 0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.5rem",
                    color: "#00e676",
                    fontWeight: 900,
                    lineHeight: 1,
                    border: "1px solid #00e676",
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          );
        })
      )}

      {/* 交差点 (4×4) */}
      {Array.from({ length: INTERSECTION_SIZE }, (_, row) =>
        Array.from({ length: INTERSECTION_SIZE }, (_, col) => {
          const pos: IntersectionPos = { row, col };
          const heliIndex = getHelicopterAt(pos);
          const hasHeli = heliIndex >= 0;
          const highlighted = isHighlightedIntersection(pos);
          const clickable =
            !!onIntersectionClick &&
            (highlighted || state.phase === "police-setup");
          const isActiveHeli =
            activeHelicopterIndex !== undefined &&
            heliIndex === activeHelicopterIndex;

          const size = hasHeli ? 28 : highlighted ? 22 : 14;
          const heliColor = hasHeli
            ? HELI_COLORS[heliIndex % HELI_COLORS.length]
            : undefined;

          const intersectionAnimClass = isActiveHeli
            ? "animate-cc-heli-pulse"
            : highlighted
              ? "animate-cc-highlight-intersection"
              : "";

          return (
            <div
              key={`i-${row}-${col}`}
              className={clsx(clickable && "cc-intersection-clickable", intersectionAnimClass) || undefined}
              onClick={() => clickable && onIntersectionClick?.(pos)}
              style={{
                position: "absolute",
                left: PAD + col * TOTAL + CELL + GAP / 2 - size / 2,
                top: PAD + row * TOTAL + CELL + GAP / 2 - size / 2,
                width: size,
                height: size,
                borderRadius: "50%",
                background: hasHeli
                  ? heliColor
                  : highlighted
                    ? "rgba(0, 230, 118, 0.35)"
                    : "rgba(37, 140, 244, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: hasHeli ? "0.55rem" : "0.6rem",
                color: "white",
                fontWeight: 900,
                fontFamily: hasHeli ? "'Orbitron', monospace" : "inherit",
                letterSpacing: hasHeli ? "0.05em" : "normal",
                border: isActiveHeli
                  ? "3px solid #fbbf24"
                  : hasHeli
                    ? `2px solid ${heliColor}cc`
                    : "1px solid rgba(37, 140, 244, 0.3)",
                zIndex: 10,
                transition: "transform 0.12s, filter 0.12s",
                userSelect: "none",
                boxShadow: isActiveHeli
                  ? `0 0 16px 4px ${heliColor}88`
                  : hasHeli
                    ? `0 0 12px 2px ${heliColor}66`
                    : highlighted
                      ? "0 0 8px 2px rgba(0, 230, 118, 0.4)"
                      : "0 2px 4px rgba(0,0,0,.3)",
              }}
            >
              {hasHeli ? `H${heliIndex + 1}` : ""}
            </div>
          );
        })
      )}
    </div>
    </div>
    </div>
  );
}
