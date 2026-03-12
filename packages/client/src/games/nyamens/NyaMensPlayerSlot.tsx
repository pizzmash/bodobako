import type { NyaMensPlayerView } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { NYAMENS_ACCENT as ACCENT } from "../../styles/tokens";

export function NyaMensPlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = (gameState?.gameId === "nyamens" ? gameState.state : null) as NyaMensPlayerView | null;
  if (!state) return null;

  const playerIndex = state.playerOrder.indexOf(slotPlayerId);
  const isDuty = playerIndex === state.repairDutyIndex;
  const isKnownAssassin =
    state.assassinIds.includes(slotPlayerId) ||
    (isMe && state.myRole === "assassin");
  const handCount = isMe ? state.myHand.length : (state.otherHandCounts[slotPlayerId] ?? 0);
  const isReady = state.readyPlayers.includes(slotPlayerId);

  // role-reveal フェーズ: 準備完了かどうかを表示
  if (state.phase === "role-reveal") {
    return (
      <div className="text-xs mt-1" style={{ color: isReady ? "#22c55e" : "#94a3b8" }}>
        {isReady ? "準備完了" : "確認中..."}
      </div>
    );
  }

  // 終了フェーズ: 役職を表示（revealedRoles があれば）
  if (state.phase === "finished") {
    const role = state.revealedRoles?.[slotPlayerId];
    if (role) {
      const isAssassin = role === "assassin";
      return (
        <div className="text-xs mt-1" style={{ color: isAssassin ? "#ef4444" : ACCENT }}>
          {isAssassin ? "アサシン" : "ニャーメンズ"}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* 手札枚数 */}
      <span className="text-xs" style={{ color: "#94a3b8" }}>
        <span style={{ color: "#1e293b", fontWeight: 700 }}>{handCount}</span> 枚
      </span>
      {/* 修理当番 */}
      {isDuty && (
        <span className="text-xs" style={{ color: ACCENT, fontWeight: 700 }}>
          🛠️ 当番
        </span>
      )}
      {/* 自分のみ役割表示（アサシンの場合） */}
      {isKnownAssassin && (
        <span className="text-xs" style={{ color: "#ef4444" }}>
          🗡️
        </span>
      )}
    </div>
  );
}
