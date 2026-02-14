import { useEffect, useRef, useState, useCallback } from "react";
import type {
  CitychasePlayerView,
  BuildingPos,
  IntersectionPos,
} from "@bodobako/shared";
import {
  CITYCHASE_BOARD_SIZE as BOARD_SIZE,
  INTERSECTION_SIZE,
  isSamePos,
  posKey,
} from "@bodobako/shared";

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

const HELI_COLORS = ["#2563eb", "#059669", "#d97706"];

const CSS_ID = "cc-board-styles";
const INJECTED_CSS = `
@keyframes cc-highlight-green {
  0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,.0), 0 0 6px 2px rgba(34,197,94,.0); }
  50% { box-shadow: 0 0 0 3px rgba(34,197,94,.6), 0 0 6px 2px rgba(34,197,94,.3); }
}
@keyframes cc-highlight-amber {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245,158,11,.0), 0 0 6px 2px rgba(245,158,11,.0); }
  50% { box-shadow: 0 0 0 3px rgba(245,158,11,.6), 0 0 6px 2px rgba(245,158,11,.3); }
}
@keyframes cc-highlight-intersection {
  0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,.0), 0 0 4px 1px rgba(34,197,94,.0); }
  50% { box-shadow: 0 0 0 2px rgba(34,197,94,.7), 0 0 4px 1px rgba(34,197,94,.4); }
}
@keyframes cc-heli-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,.4); }
  50% { box-shadow: 0 0 0 5px rgba(59,130,246,0); }
}
@keyframes cc-criminal-glow {
  0%, 100% { box-shadow: 0 0 4px 2px rgba(220,38,38,.3); }
  50% { box-shadow: 0 0 10px 4px rgba(220,38,38,.5); }
}
.cc-building-clickable { cursor: pointer !important; }
.cc-building-clickable:hover { transform: scale(1.06) !important; filter: brightness(1.08) !important; }
.cc-intersection-clickable { cursor: pointer !important; }
.cc-intersection-clickable:hover { transform: scale(1.2) !important; filter: brightness(1.1) !important; }
`;

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

  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const tag = document.createElement("style");
    tag.id = CSS_ID;
    tag.textContent = INJECTED_CSS;
    document.head.appendChild(tag);
    return () => { document.getElementById(CSS_ID)?.remove(); };
  }, []);

  const getTraceInfo = (pos: BuildingPos) =>
    state.revealedTraces.find((t) => isSamePos(t.pos, pos));

  const isSearchedEmpty = (pos: BuildingPos) =>
    state.searchedEmpty.some((p) => isSamePos(p, pos));

  const isHighlightedBuilding = (pos: BuildingPos) =>
    highlightBuildings.some((p) => isSamePos(p, pos));

  const isSearchableBuilding = (pos: BuildingPos) =>
    searchableBuildings.some((p) => isSamePos(p, pos));

  const isHighlightedIntersection = (pos: IntersectionPos) =>
    highlightIntersections.some((p) => isSamePos(p, pos));

  const getHelicopterAt = (pos: IntersectionPos) =>
    state.helicopters.findIndex((h) => h && isSamePos(h, pos));

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
        background: "linear-gradient(145deg, #e2e8f0, #cbd5e0)",
        borderRadius: 12,
        boxShadow: "inset 0 2px 6px rgba(0,0,0,.1)",
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
              background: "#94a3b8",
              borderRadius: 2,
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
              background: "#94a3b8",
              borderRadius: 2,
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

          if (isCriminalHere) {
            bg = "linear-gradient(135deg, #dc2626, #b91c1c)";
            borderColor = "#7f1d1d";
            label = "🚗";
          } else if (trace) {
            bg = "linear-gradient(135deg, #fbbf24, #f59e0b)";
            borderColor = "#d97706";
            label = trace.round !== null ? `R${trace.round}` : "⚠";
            labelColor = "#78350f";
          } else if (criminalTrace) {
            bg = "linear-gradient(135deg, #fca5a5, #f87171)";
            borderColor = "#ef4444";
            label = criminalRound === 1 || criminalRound === 6 ? `R${criminalRound}` : "👣";
            labelColor = "#7f1d1d";
          } else {
            // 通常ビル（捜索済みでも同じ見た目）
            bg = "linear-gradient(135deg, #64748b, #475569)";
            borderColor = "#334155";
          }

          // ハイライトアニメーション（色は上書きせず枠の光で表現）
          let animation: string | undefined;
          if (isCriminalHere) {
            animation = "cc-criminal-glow 2s ease-in-out infinite";
          } else if (highlighted) {
            animation = "cc-highlight-green 1.2s ease-in-out infinite";
          } else if (searchable) {
            animation = "cc-highlight-amber 1.2s ease-in-out infinite";
          }

          return (
            <div
              key={`b-${row}-${col}`}
              className={clickable ? "cc-building-clickable" : undefined}
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
                fontSize: label.length > 1 ? "0.65rem" : "1rem",
                color: labelColor,
                fontWeight: 800,
                border: `2px solid ${borderColor}`,
                transition: "transform 0.12s, filter 0.12s",
                userSelect: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                animation,
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
                    background: "rgba(255,255,255,.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.5rem",
                    color: "#16a34a",
                    fontWeight: 900,
                    lineHeight: 1,
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

          return (
            <div
              key={`i-${row}-${col}`}
              className={clickable ? "cc-intersection-clickable" : undefined}
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
                    ? "rgba(34,197,94,.3)"
                    : "rgba(148,163,184,.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: hasHeli ? "0.85rem" : "0.6rem",
                color: "white",
                fontWeight: 700,
                border: isActiveHeli
                  ? "3px solid #fbbf24"
                  : hasHeli
                    ? `2px solid ${heliColor}88`
                    : "none",
                zIndex: 10,
                transition: "transform 0.12s, filter 0.12s",
                userSelect: "none",
                boxShadow: isActiveHeli
                  ? `0 0 10px 3px ${heliColor}66`
                  : hasHeli
                    ? `0 2px 6px ${heliColor}44`
                    : "none",
                animation: isActiveHeli
                  ? "cc-heli-pulse 1.5s ease-in-out infinite"
                  : highlighted
                    ? "cc-highlight-intersection 1.2s ease-in-out infinite"
                    : undefined,
              }}
            >
              {hasHeli ? "🚁" : ""}
            </div>
          );
        })
      )}
    </div>
    </div>
    </div>
  );
}
