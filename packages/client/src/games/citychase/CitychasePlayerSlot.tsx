import type { CitychasePlayerView } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export function CitychasePlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = (gameState?.gameId === "citychase" ? gameState.state : null) as CitychasePlayerView | null;
  if (!state) return null;

  // role-select より前のフェーズ（criminalId が未定）は表示なし
  if (state.phase === "role-select") return null;

  // 自分のカード: 役割を表示
  if (isMe) {
    const isCriminal = state.isCriminal;
    return (
      <div className="text-xs mt-1" style={{ color: isCriminal ? "#ef4444" : "#3b82f6" }}>
        {isCriminal ? "犯人" : "警察"}
      </div>
    );
  }

  // 他プレイヤーのカード: 犯人の場合は警察には役割が隠れている
  // criminalId が公開されていれば（ゲーム終了後など）役割を表示
  const isCriminal = state.criminalId === slotPlayerId;
  const isPolice = state.policeIds.includes(slotPlayerId);

  if (isCriminal) {
    return (
      <div className="text-xs mt-1" style={{ color: "#ef4444" }}>
        犯人
      </div>
    );
  }
  if (isPolice) {
    return (
      <div className="text-xs mt-1" style={{ color: "#3b82f6" }}>
        警察
      </div>
    );
  }

  return (
    <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
      ?
    </div>
  );
}
