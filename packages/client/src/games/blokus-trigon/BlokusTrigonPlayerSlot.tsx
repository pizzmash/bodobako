import { trigonComputeRemainingCells } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { TRIGON_COLORS } from "./constants";

export function BlokusTrigonPlayerSlot({ playerId: slotPlayerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = gameState?.gameId === "blokus-trigon" ? gameState.state : null;
  if (!state) return null;

  const playerIndex = state.playerIds.indexOf(slotPlayerId);
  if (playerIndex === -1) return null;

  const displayColors = Array.from(
    { length: state.numColors },
    (_, i) => i,
  ).filter((c) => state.colorOwner[c] === playerIndex);

  if (displayColors.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap items-center mt-0.5">
      {displayColors.map((colorIndex) => {
        const remaining = trigonComputeRemainingCells(state, colorIndex);
        const isEliminated = state.eliminated[colorIndex];
        const accentColor = TRIGON_COLORS[colorIndex]?.fill ?? "#888";
        return (
          <span
            key={colorIndex}
            className="flex items-center gap-0.5"
            style={{ opacity: isEliminated ? 0.4 : 1 }}
          >
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ background: accentColor }}
            />
            <span className="text-[0.68rem] text-slate-500">
              {remaining}マス
            </span>
          </span>
        );
      })}
    </div>
  );
}
