import type { CitychaseMove } from "@bodobako/shared";
import { useCallback } from "react";
import { useRoom } from "../../context/RoomContext";
import { Z } from "../../styles/tokens";
import { GameBoard } from "./GameBoard";
import { RoleSelect } from "./RoleSelect";
import { SetupPhase } from "./SetupPhase";

function CityChaseTitle() {
  return (
    <div className="flex items-center gap-4 mb-6 relative">
      <div
        className="text-3xl"
        style={{ filter: "drop-shadow(0 0 12px #258cf4)" }}
      >
        ⚡
      </div>
      <h2 className="cc-text-title text-3xl font-extrabold m-0">CITY CHASE</h2>
      <div
        className="absolute right-0 text-[#258cf4]/60 tracking-[0.15em] uppercase font-semibold"
        style={{ fontSize: "0.7rem", bottom: "-0.5rem" }}
      >
        Tactical Command
      </div>
    </div>
  );
}

export function CitychaseBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();

  const sendTypedMove = useCallback(
    (move: CitychaseMove) => sendMove(move),
    [sendMove]
  );

  if (gameState !== null && gameState.gameId !== "citychase") return null;
  const state = gameState?.state ?? null;

  if (!state || !playerId || !room) return null;

  return (
    <div
      className="relative flex flex-col items-center p-4 min-h-screen text-white"
      style={{ background: "radial-gradient(circle at center, #0f1419 0%, #0a0b10 100%)" }}
    >
      {/* スキャンラインオーバーレイ */}
      <div className="cc-scanlines fixed inset-0 pointer-events-none" style={{ zIndex: Z.scanlines }} />

      <CityChaseTitle />

      {state.phase === "role-select" && (
        <RoleSelect state={state} playerId={playerId} room={room} sendMove={sendTypedMove} />
      )}
      {(state.phase === "police-setup" || state.phase === "criminal-setup") && (
        <SetupPhase state={state} playerId={playerId} room={room} sendMove={sendTypedMove} />
      )}
      {state.phase !== "role-select" &&
        state.phase !== "police-setup" &&
        state.phase !== "criminal-setup" && (
          <GameBoard
            state={state}
            playerId={playerId}
            room={room}
            sendMove={sendTypedMove}
            gameResult={gameResult}
            startGame={startGame}
            leaveRoom={leaveRoom}
          />
        )}
    </div>
  );
}
