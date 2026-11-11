import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export default function BluffitPlayerSlot({ playerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  if (gameState?.gameId !== "bluffit") return null;
  const s = gameState.state;
  return (
    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
      <span>得点山の上　{s.tops[playerId] ?? "―"}</span>
      <strong>
        {!s.order.includes(playerId)
          ? "観戦中"
          : s.claims[playerId]
            ? `${s.claims[playerId]} を確保中`
            : s.ready.includes(playerId)
              ? "指し値セット済み"
              : "選択中"}
      </strong>
    </div>
  );
}
