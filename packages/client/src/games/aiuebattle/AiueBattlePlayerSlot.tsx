import type { AiueBattleState } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";

export function AiueBattlePlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
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

  // battle フェーズ: 単語タイル表示 or 脱落表示
  if (state.phase === "battle") {
    if (isEliminated) {
      return (
        <div className="text-xs mt-1" style={{ color: "#ef4444" }}>
          脱落
        </div>
      );
    }
    const words = state.words[slotPlayerId] ?? [];
    const revealedArr = state.revealed[slotPlayerId] ?? [];
    return (
      <div className="flex flex-wrap gap-px mt-1">
        {words.map((char, i) => {
          const revealStatus = revealedArr[i];
          const isRevealed = revealStatus === true;
          const isEnd = revealStatus === "end";
          const bg = isRevealed ? "#FFC107" : isEnd ? "#94a3b8" : "#ffffff";
          const textColor = isEnd ? "#ffffff" : "#171717";
          const displayChar = isRevealed || isEnd || isMe ? char : "?";
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center rounded flex-shrink-0"
              style={{
                width: 18,
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                background: bg,
                color: textColor,
                border: "1px solid #e2e8f0",
              }}
            >
              {displayChar}
            </span>
          );
        })}
      </div>
    );
  }

  return null;
}
