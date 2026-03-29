import type { HyperRobotState } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { C, FONT, TARGET_COLORS } from "./constants";
import { useTargetIconMap } from "./hooks/useTargetIconMap";

export function HyperRobotPlayerSlot({ playerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state: HyperRobotState | null =
    gameState?.gameId === "hyper-robot" ? gameState.state : null;

  const iconMap = useTargetIconMap(state?.allTargets ?? []);

  if (!state) return null;

  const chips = state.chips[playerId] ?? 0;
  const winChips = state.winChips;
  const wonIds = state.wonTargets?.[playerId] ?? [];

  // 宣言情報
  const myBid = state.bids.find((b) => b.playerId === playerId);

  // 現在の解決者か
  const isCurrentSolver =
    state.phase === "solving" &&
    state.bids[state.currentBidIndex]?.playerId === playerId;

  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{ fontFamily: FONT }}
    >
      {/* チップ数 */}
      <div className="flex flex-col gap-0.5">
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold"
          style={{
            background: chips > 0 ? `${C.primary}22` : "transparent",
            color: chips > 0 ? C.secondary : C.muted,
            border: `1px solid ${chips > 0 ? C.cardBorder : "transparent"}`,
          }}
        >
          <ChipIcon />
          <span className="tabular-nums">{chips}</span>
          <span style={{ color: C.muted, fontWeight: 400 }}>/ {winChips}</span>
        </div>
        {winChips > 0 && (
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: 96 }}>
            {Array.from({ length: winChips }, (_, i) => {
              const wonTargetId = wonIds[i];
              const wonTarget = wonTargetId != null
                ? state.allTargets.find(t => t.id === wonTargetId)
                : null;
              const Icon = wonTarget ? iconMap.get(wonTarget.id) : null;
              const color = wonTarget ? TARGET_COLORS[wonTarget.color] : undefined;
              return Icon && color ? (
                <Icon key={i} size={16} color={color} strokeWidth={2} />
              ) : (
                <DashedCircle key={i} size={16} />
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

function ChipIcon({ size = 12, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ opacity: filled ? 1 : 0.25 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function DashedCircle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ opacity: 0.2 }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"
        strokeDasharray="4 3" />
    </svg>
  );
}
