import type { CiaoCiaoStateView } from "@bodobako/shared";
import { Star } from "lucide-react";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { CC, CIAO_PLAYER_COLORS } from "./constants";
import { Meeple } from "./Meeple";

export function CiaoCiaoPlayerSlot({ playerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = gameState?.gameId === "ciao-ciao"
    ? (gameState.state as CiaoCiaoStateView)
    : null;
  if (!state) return null;

  const goals = state.goals[playerId] ?? 0;
  const stock = state.stocks[playerId] ?? 0;
  const bridgePos = state.bridgePositions[playerId];
  const colorIdx = state.playerIds.indexOf(playerId);
  const color = CIAO_PLAYER_COLORS[colorIdx]?.meeple ?? "#888";

  // 着順ポイント合計（1着=1pt, 2着=2pt, 3着=3pt）
  const slotPt = state.goalSlots
    .filter((s) => s.playerId === playerId)
    .reduce((sum, s) => sum + s.slot, 0);

  const isEliminated = bridgePos === null && stock === 0 && goals === 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* ゴール数 */}
      <span
        className="px-1.5 py-0.5 rounded font-bold"
        style={{ background: CC.primaryContainer, color: CC.onPrimaryContainer }}
      >
        <Star size={12} fill={CC.primary} color={CC.primary} className="inline" /> {goals}
      </span>

      {/* 着順ポイント */}
      <span className="font-bold" style={{ color: CC.primary }}>
        {slotPt} pt
      </span>

      {/* ステータス */}
      {isEliminated && (
        <span style={{ color: CC.outline }}>脱落</span>
      )}

      {/* 残りストック */}
      <span className="ml-auto flex items-center gap-0.5" style={{ color: CC.outline }}>
        {Array.from({ length: Math.min(stock, 6) }).map((_, i) => (
          <Meeple key={i} color={color} size={10} />
        ))}
        <span className="text-[0.65rem]">×{stock}</span>
      </span>
    </div>
  );
}
