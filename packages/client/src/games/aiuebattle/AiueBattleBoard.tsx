import type { AiueBattleMove } from "@bodobako/shared";
import { useCallback, useState } from "react";
import { useRoom } from "../../context/RoomContext";
import { BattleBoard } from "./BattleBoard";
import { C, FONT, RADIUS } from "./constants";
import { useAiueState } from "./hooks/useAiueState";
import { TopicSelect } from "./TopicSelect";
import { WordInput } from "./WordInput";

export function AiueBattleBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  if (gameState !== null && gameState.gameId !== "aiuebattle") return null;
  const state = gameState?.state ?? null;
  const [wordChars, setWordChars] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [showWordConfirm, setShowWordConfirm] = useState(false);

  const { attackAnim, newlyRevealed } = useAiueState(state);

  const sendTypedMove = useCallback(
    (move: AiueBattleMove) => sendMove(move),
    [sendMove]
  );

  if (!state || !playerId || !room) return null;

  // カラフルでポップなタイトル
  const Title = (
    <h2
      className="m-0 my-4 text-4xl font-black tracking-[0.05em] text-center flex items-center justify-center flex-wrap"
      style={{ gap: "clamp(4px, 1vw, 8px)", fontFamily: FONT }}
    >
      {[
        { char: "あ", color: "#ff5c8d", rotate: "-2deg" },
        { char: "い", color: "#ffbc42", rotate: "2deg" },
        { char: "う", color: "#0496ff", rotate: "-1deg" },
        { char: "え", color: "#06d6a0", rotate: "1deg" },
        { char: "バトル", color: "#9d4edd", rotate: "0deg" },
      ].map((item, i) => (
        <span
          key={i}
          className="ab-title-char inline-block"
          style={{
            color: item.color,
            background: C.bgCard,
            padding: "clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)",
            borderRadius: RADIUS.md,
            border: `2px solid ${item.color}`,
            transform: `rotate(${item.rotate})`,
            boxShadow: `0 4px 12px ${item.color}30`,
            transition: "transform 0.2s ease",
          }}
        >
          {item.char}
        </span>
      ))}
    </h2>
  );

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4 text-[#171717]"
      style={{ background: C.gray50, fontFamily: FONT }}
    >
      {Title}

      {state.phase === "topic-select" && (
        <TopicSelect
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          customTopic={customTopic}
          setCustomTopic={setCustomTopic}
        />
      )}
      {state.phase === "word-input" && (
        <WordInput
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          wordChars={wordChars}
          setWordChars={setWordChars}
          showWordConfirm={showWordConfirm}
          setShowWordConfirm={setShowWordConfirm}
        />
      )}
      {state.phase === "battle" && (
        <BattleBoard
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          gameResult={gameResult}
          startGame={startGame}
          leaveRoom={leaveRoom}
          attackAnim={attackAnim}
          newlyRevealed={newlyRevealed}
        />
      )}
    </div>
  );
}
