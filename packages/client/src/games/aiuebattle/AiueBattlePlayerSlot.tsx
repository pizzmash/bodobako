import type { AiueBattleState } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { Target } from "lucide-react";
import { useRoom } from "../../context/RoomContext";
import { C } from "./constants";

export function AiueBattlePlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = (gameState?.gameId === "aiuebattle" ? gameState.state : null) as AiueBattleState | null;
  if (!state) return null;

  const isEliminated = state.eliminatedPlayers.includes(slotPlayerId);

  // word-input フェーズ
  if (state.phase === "word-input") {
    const hasSubmitted = state.submittedPlayers.includes(slotPlayerId);
    return (
      <div className="text-xs font-semibold mt-0.5" style={{ color: hasSubmitted ? "#22c55e" : C.textSub }}>
        {hasSubmitted ? "✓ 提出済" : "入力中..."}
      </div>
    );
  }

  // topic-select フェーズ
  if (state.phase === "topic-select") {
    const isSelector = state.topicSelectorId === slotPlayerId;
    return (
      <div className="text-xs font-semibold mt-0.5" style={{ color: isSelector ? C.warning : C.textSub }}>
        {isSelector ? <><Target size={12} className="inline mr-1" />お題選択中</> : "待機中"}
      </div>
    );
  }

  // battle フェーズ
  if (state.phase === "battle") {
    const words = state.words[slotPlayerId] ?? [];
    const revealedArr = state.revealed[slotPlayerId] ?? [];

    return (
      <div className="flex flex-wrap gap-1 mt-1" style={isEliminated ? { filter: "grayscale(1)" } : undefined}>
        {words.map((char, i) => {
          const revealStatus = revealedArr[i];
          const isRevealed = revealStatus === true;
          const isEnd = revealStatus === "end";

          // 旧 PlayerSheet の色ロジックに準拠
          let bg: string;
          let textColor: string;
          let borderStyle: string;
          let borderColor: string;
          let boxShadow: string | undefined;

          if (isMe) {
            if (isEnd) {
              // ゲーム終了で公開（当てられなかった）
              bg = C.gray100;
              textColor = C.textSub;
              borderStyle = "solid";
              borderColor = C.borderDark;
              boxShadow = undefined;
            } else if (isRevealed) {
              // 攻撃で公開済み
              bg = C.primary;
              textColor = C.textMain;
              borderStyle = "solid";
              borderColor = C.primary;
              boxShadow = `0 2px 8px ${C.primary}60`;
            } else {
              // 未公開（自分の文字）
              bg = C.bgCard;
              textColor = C.textMain;
              borderStyle = "dashed";
              borderColor = C.border;
              boxShadow = undefined;
            }
          } else {
            if (isEnd) {
              // 他人のゲーム終了公開（当てられなかった）
              bg = C.gray100;
              textColor = C.textSub;
              borderStyle = "solid";
              borderColor = C.borderDark;
              boxShadow = undefined;
            } else if (isRevealed) {
              // 他人の攻撃で公開済み
              bg = C.primaryLight;
              textColor = C.textMain;
              borderStyle = "solid";
              borderColor = C.primary;
              boxShadow = undefined;
            } else {
              // 他人の未公開（"?" 表示）
              bg = "transparent";
              textColor = C.textSub;
              borderStyle = "dashed";
              borderColor = C.border;
              boxShadow = undefined;
            }
          }

          const displayChar = isMe || isRevealed || isEnd ? char : "?";

          return (
            <span
              key={i}
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 32,
                fontSize: 13,
                fontWeight: 800,
                background: bg,
                color: textColor,
                border: `1.5px ${borderStyle} ${borderColor}`,
                borderRadius: 6,
                boxShadow,
                transition: "all 0.3s ease",
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
