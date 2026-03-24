import type { CiaoCiaoStateView } from "@bodobako/shared";
import { useMemo } from "react";
import { BridgeTile } from "./BridgeTile";
import { CC, CIAO_PLAYER_COLORS } from "./constants";
import { GoalArea } from "./GoalArea";
import { Meeple } from "./Meeple";
import { MeepleBubble } from "./MeepleBubble";

interface BridgeProps {
  state: CiaoCiaoStateView;
  highlightedTile?: number | null;
  getName: (pid: string) => string;
  getPhotoURL: (pid: string) => string | undefined;
}

export function Bridge({ state, highlightedTile, getName, getPhotoURL }: BridgeProps) {
  // 各タイルに乗っているコマを計算
  const tileMeeples = useMemo(() => {
    const map: Record<number, { playerId: string; colorIndex: number }[]> = {};
    for (let i = 0; i <= 9; i++) map[i] = [];
    for (const pid of state.playerIds) {
      const pos = state.bridgePositions[pid];
      if (pos !== null && pos >= 0 && pos <= 9) {
        const colorIndex = state.playerIds.indexOf(pid);
        map[pos].push({ playerId: pid, colorIndex });
      }
    }
    return map;
  }, [state.bridgePositions, state.playerIds]);

  // ゴールエリアのコマ（到達順）
  const goalMeeples = useMemo(() => {
    return state.goalSlots.map((s) => ({
      playerId: s.playerId,
      color: CIAO_PLAYER_COLORS[state.playerIds.indexOf(s.playerId)]?.meeple ?? "#888",
    }));
  }, [state.goalSlots, state.playerIds]);

  return (
    <div className="flex items-start justify-center gap-1 px-4">
      {/* スタート地点 */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="flex items-end justify-center pb-2 rounded-lg shadow-md shrink-0 relative"
          style={{
            width: "clamp(48px, 7vw, 80px)",
            height: "clamp(64px, 9vw, 112px)",
            background: CC.surfaceHighest,
            border: `2px dashed ${CC.outlineVariant}`,
          }}
        >
          <span
            className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold pointer-events-none"
            style={{ color: CC.outline }}
          >
            START
          </span>
          <div className="flex items-end justify-center">
            {(tileMeeples[0] ?? []).map((m, i) => (
              <div key={m.playerId} className={i > 0 ? "-ml-1" : ""}>
                <Meeple
                  color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
                  size={24}
                />
              </div>
            ))}
          </div>
        </div>
        {/* 吹き出し */}
        {(tileMeeples[0] ?? []).length > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {(tileMeeples[0] ?? []).map((m) => (
              <MeepleBubble
                key={m.playerId}
                name={getName(m.playerId)}
                photoURL={getPhotoURL(m.playerId)}
                color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
              />
            ))}
          </div>
        )}
      </div>

      {/* マス 1〜9 */}
      {Array.from({ length: 9 }, (_, i) => i + 1).map((tileIndex) => (
        <BridgeTile
          key={tileIndex}
          index={tileIndex}
          meeples={tileMeeples[tileIndex] ?? []}
          isHighlighted={highlightedTile === tileIndex}
          getName={getName}
          getPhotoURL={getPhotoURL}
        />
      ))}

      {/* ゴールエリア */}
      <GoalArea goalMeeples={goalMeeples} isHighlighted={highlightedTile !== null && highlightedTile > 9} />
    </div>
  );
}
