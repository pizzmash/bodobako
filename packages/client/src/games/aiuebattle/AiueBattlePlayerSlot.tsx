import type { AiueBattleState } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export function AiueBattlePlayerSlot({ playerId: slotPlayerId }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = (gameState?.gameId === "aiuebattle" ? gameState.state : null) as AiueBattleState | null;
  if (!state) return null;

  const isEliminated = state.eliminatedPlayers.includes(slotPlayerId);

  // word-input フェーズ: 提出済みかどうかを表示
  if (state.phase === "word-input") {
    const hasSubmitted = state.submittedPlayers.includes(slotPlayerId);
    return (
      <div className="text-xs mt-1" style={{ color: hasSubmitted ? "#22c55e" : "#94a3b8" }}>
        {hasSubmitted ? "提出済" : "入力中..."}
      </div>
    );
  }

  // topic-select フェーズ: お題選択中/待機中を表示
  if (state.phase === "topic-select") {
    const isSelector = state.topicSelectorId === slotPlayerId;
    return (
      <div className="text-xs mt-1" style={{ color: isSelector ? "#f59e0b" : "#94a3b8" }}>
        {isSelector ? "お題選択中" : "待機中"}
      </div>
    );
  }

  // battle フェーズ: 残り文字数 or 脱落表示
  if (state.phase === "battle") {
    if (isEliminated) {
      return (
        <div className="text-xs mt-1" style={{ color: "#ef4444" }}>
          脱落
        </div>
      );
    }
    const revealed = state.revealed[slotPlayerId] ?? [];
    const remaining = revealed.filter((v) => v === false).length;
    const total = revealed.filter((v) => v !== "end").length;
    return (
      <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
        残り <span style={{ color: "#171717", fontWeight: 700 }}>{remaining}</span> / {total} 文字
      </div>
    );
  }

  return null;
}
