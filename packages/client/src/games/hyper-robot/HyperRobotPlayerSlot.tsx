import type { HyperRobotState, TargetMark } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { C, FONT, TARGET_COLORS } from "./constants";
import { useTargetIconMap } from "./hooks/useTargetIconMap";
import { TargetChip } from "./TargetChip";

const EMPTY_TARGETS: TargetMark[] = [];

export function HyperRobotPlayerSlot({ playerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state: HyperRobotState | null =
    gameState?.gameId === "hyper-robot" ? gameState.state : null;

  const iconMap = useTargetIconMap(state?.allTargets ?? EMPTY_TARGETS);

  if (!state) return null;

  const chips = state.chips[playerId] ?? 0;
  const winChips = state.winChips;
  const wonIds = state.wonTargets?.[playerId] ?? [];

  const myBid = state.bids.find((b) => b.playerId === playerId);
  const isCurrentSolver =
    state.phase === "solving" &&
    state.bids[state.currentBidIndex]?.playerId === playerId;

  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{ fontFamily: FONT }}
    >
      {/* チップカウンター */}
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{
            background: chips > 0 ? `${C.primary}22` : "rgba(255,255,255,0.04)",
            border: `1px solid ${chips > 0 ? C.cardBorder : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <span
            className="tabular-nums font-bold"
            style={{ color: chips > 0 ? C.secondary : C.muted }}
          >
            {chips}
          </span>
          <span style={{ color: C.muted, fontWeight: 400 }}>/ {winChips}</span>
        </div>

        {/* 獲得チップグリッド */}
        {winChips > 0 && (
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: 104 }}>
            {Array.from({ length: winChips }, (_, i) => {
              const wonTargetId = wonIds[i];
              const wonTarget = wonTargetId != null
                ? state.allTargets.find(t => t.id === wonTargetId)
                : null;
              const Icon = wonTarget ? iconMap.get(wonTarget.id) : null;
              const color = wonTarget ? TARGET_COLORS[wonTarget.color] : undefined;
              return Icon && color ? (
                <TargetChip key={i} Icon={Icon} color={color} size={17} />
              ) : (
                <CoinSlot key={i} size={17} />
              );
            })}
          </div>
        )}
      </div>

      {/* フェーズ別バッジ */}
      {state.phase === "bidding" && myBid && (
        <span
          className="px-1.5 py-0.5 rounded font-bold tabular-nums"
          style={{ background: `${C.accent}22`, color: C.accent }}
        >
          {myBid.count}手
        </span>
      )}

      {isCurrentSolver && (
        <span
          className="px-1.5 py-0.5 rounded font-bold"
          style={{
            background: `${C.primary}33`,
            color: C.secondary,
            border: `1px solid ${C.cardBorder}`,
          }}
        >
          解決中
        </span>
      )}
    </div>
  );
}

/** 空のコインスロット（凹み） */
function CoinSlot({ size = 17 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.42)",
        boxShadow: [
          "inset 0 2px 5px rgba(0,0,0,0.72)",
          "inset 0 0 6px rgba(0,0,0,0.4)",
        ].join(", "),
        border: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    />
  );
}
