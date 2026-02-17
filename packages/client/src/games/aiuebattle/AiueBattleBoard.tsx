import { useState, useCallback } from "react";
import { useRoom } from "../../context/RoomContext";
import type { AiueBattleState, AiueBattleMove } from "@bodobako/shared";
import { useAiueState } from "./hooks/useAiueState";
import { C, FONT, styles, SPACING, TYPOGRAPHY, RADIUS } from "./constants";
import { TopicSelect } from "./TopicSelect";
import { WordInput } from "./WordInput";
import { BattleBoard } from "./BattleBoard";
import "./aiuebattle.css";

export function AiueBattleBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  const state = gameState as AiueBattleState | null;
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
      style={{
        ...TYPOGRAPHY["3xl"],
        fontWeight: 900,
        margin: `${SPACING.lg} 0 ${SPACING.xl}`,
        fontFamily: FONT,
        letterSpacing: "0.05em",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(4px, 1vw, 8px)",
        flexWrap: "wrap",
      }}
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
          style={{
            color: item.color,
            background: C.bgCard,
            padding: "clamp(4px, 1vw, 8px) clamp(8px, 2vw, 16px)",
            borderRadius: RADIUS.md,
            border: `2px solid ${item.color}`,
            transform: `rotate(${item.rotate})`,
            display: "inline-block",
            boxShadow: `0 4px 12px ${item.color}30`,
            transition: "transform 0.2s ease",
          }}
          className="ab-title-char"
        >
          {item.char}
        </span>
      ))}
    </h2>
  );

  if (state.phase === "topic-select") {
    return (
      <div style={styles.container}>
        {Title}
        <TopicSelect
          state={state}
          playerId={playerId}
          room={room}
          sendTypedMove={sendTypedMove}
          customTopic={customTopic}
          setCustomTopic={setCustomTopic}
        />
      </div>
    );
  }

  if (state.phase === "word-input") {
    return (
      <div style={styles.container}>
        {Title}
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
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {Title}
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
    </div>
  );
}
