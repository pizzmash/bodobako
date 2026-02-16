import { useCallback, useEffect } from "react";
import { useRoom } from "../../context/RoomContext";
import type { CitychasePlayerView, CitychaseMove } from "@bodobako/shared";
import { RoleSelect } from "./RoleSelect";
import { SetupPhase } from "./SetupPhase";
import { GameBoard } from "./GameBoard";
import "./citychase.css";

export function CitychaseBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  const state = gameState as CitychasePlayerView | null;

  const sendTypedMove = useCallback(
    (move: CitychaseMove) => sendMove(move),
    [sendMove]
  );

  // スキャンラインエフェクトをマウント時に追加
  useEffect(() => {
    const existingScanlines = document.getElementById("cc-scanlines-overlay");
    if (existingScanlines) return;

    const scanlines = document.createElement("div");
    scanlines.id = "cc-scanlines-overlay";
    scanlines.className = "cc-scanlines";
    scanlines.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(scanlines);

    return () => {
      const el = document.getElementById("cc-scanlines-overlay");
      if (el) el.remove();
    };
  }, []);

  if (!state || !playerId || !room) return null;

  const Title = (
    <div style={styles.titleWrapper}>
      <div style={styles.titleIcon}>⚡</div>
      <h2 className="cc-text-title" style={styles.title}>
        CITY CHASE
      </h2>
      <div style={styles.titleSubtext}>Tactical Command</div>
    </div>
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
    padding: "1rem",
    minHeight: "100vh",
    background: "radial-gradient(circle at center, #0f1419 0%, #0a0b10 100%)",
    color: "#ffffff",
  },
  titleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    position: "relative",
  },
  titleIcon: {
    fontSize: "2rem",
    filter: "drop-shadow(0 0 12px #258cf4)",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    margin: 0,
  },
  titleSubtext: {
    fontSize: "0.7rem",
    color: "#258cf4",
    opacity: 0.6,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    fontWeight: 600,
    position: "absolute",
    bottom: "-0.5rem",
    right: 0,
  },
};
