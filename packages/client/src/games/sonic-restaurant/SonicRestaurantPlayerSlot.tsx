import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export function SonicRestaurantPlayerSlot({ playerId: slotPlayerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = gameState?.gameId === "sonic-restaurant" ? gameState.state : null;
  if (!state) return null;

  const handCount = state.hands[slotPlayerId]?.length ?? 0;

  return (
    <span className="text-xs text-slate-500 mt-0.5">手牌: {handCount}枚</span>
  );
}
