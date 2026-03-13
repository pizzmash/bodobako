import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export function SonicRestaurantPlayerSlot({ playerId: slotPlayerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = gameState?.gameId === "sonic-restaurant" ? gameState.state : null;
  if (!state) return null;

  const handCount = state.hands[slotPlayerId]?.length ?? 0;
  const isFinished = state.finishedOrder.includes(slotPlayerId);

  if (isFinished) {
    const rank = state.finishedOrder.indexOf(slotPlayerId) + 1;
    return (
      <span className="text-xs font-bold mt-0.5 text-amber-500">
        上がり {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}位`}
      </span>
    );
  }

  return (
    <span className="text-xs text-slate-500 mt-0.5">残り {handCount}枚</span>
  );
}
