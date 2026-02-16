import { useState, useCallback } from "react";
import { useRoom } from "../../context/RoomContext";
import type { AiueBattleState, AiueBattleMove } from "@bodobako/shared";
import { useAiueState } from "./hooks/useAiueState";
import { C, FONT, styles } from "./constants";
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

  const Title = (
    <h2
      style={{
        fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
        fontWeight: 900,
        margin: "1rem 0",
        fontFamily: FONT,
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(0.2rem, 1vw, 0.4rem)",
        flexWrap: "nowrap",
        overflow: "hidden",
      }}
    >
      {[
        { char: "あ", color: "#ff5c8d", rotate: "-2deg" },
        { char: "い", color: "#ffbc42", rotate: "3deg" },
        { char: "う", color: "#0496ff", rotate: "-1deg" },
        { char: "え", color: "#06d6a0", rotate: "2deg" },
        { char: "バトル", color: "#ff5c8d", rotate: "0deg" },
      ].map((item, i) => (
        <span
          key={i}
          style={{
            color: item.color,
            background: "linear-gradient(145deg, #ffffff, #fafafa)",
            padding: "clamp(0.2rem, 1vw, 0.3rem) clamp(0.5rem, 2vw, 1.1rem)",
            borderRadius: "clamp(10px, 2vw, 16px)",
            border: "2px solid rgba(0,0,0,0.08)",
            transform: `rotate(${item.rotate})`,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
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
