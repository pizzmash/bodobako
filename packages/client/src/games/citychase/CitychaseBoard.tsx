import { useCallback } from "react";
import { useRoom } from "../../context/RoomContext";
import type { CitychasePlayerView, CitychaseMove } from "@bodobako/shared";
import { RoleSelect } from "./RoleSelect";
import { SetupPhase } from "./SetupPhase";
import { GameBoard } from "./GameBoard";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

export function CitychaseBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  const state = gameState as CitychasePlayerView | null;

  const sendTypedMove = useCallback(
    (move: CitychaseMove) => sendMove(move),
    [sendMove]
  );

  if (!state || !playerId || !room) return null;

  const Title = (
    <h2
      style={{
        fontSize: "1.6rem",
        fontWeight: 800,
        margin: "0.5rem 0 0.5rem",
        background: "linear-gradient(135deg, #1e40af, #3b82f6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontFamily: FONT,
        letterSpacing: "0.05em",
      }}
    >
      シティチェイス
    </h2>
  );

  if (state.phase === "role-select") {
    return (
      <div style={styles.container}>
        {Title}
        <RoleSelect state={state} playerId={playerId} room={room} sendMove={sendTypedMove} />
      </div>
    );
  }

  if (state.phase === "police-setup" || state.phase === "criminal-setup") {
    return (
      <div style={styles.container}>
        {Title}
        <SetupPhase state={state} playerId={playerId} room={room} sendMove={sendTypedMove} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {Title}
      <GameBoard
        state={state}
        playerId={playerId}
        room={room}
        sendMove={sendTypedMove}
        gameResult={gameResult}
        startGame={startGame}
        leaveRoom={leaveRoom}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.75rem",
    maxWidth: 600,
    margin: "0 auto",
  },
};
