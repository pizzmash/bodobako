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
        fontSize: "1.6rem",
        fontWeight: 800,
        margin: "0.5rem 0 0.25rem",
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontFamily: FONT,
        letterSpacing: "0.05em",
      }}
    >
      あいうえバトル
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
        <div style={styles.topicBadge}>
          お題: <strong>{state.topic}</strong>
        </div>
        <WordInput
          state={state}
          playerId={playerId}
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
      <div style={styles.topicBadge}>
        お題: <strong>{state.topic}</strong>
      </div>
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
