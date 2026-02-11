import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { RoomInfo, GameResult } from "@claude-demo/shared";
import { socket } from "../lib/socket";

interface RoomContextValue {
  room: RoomInfo | null;
  playerId: string | null;
  gameState: unknown | null;
  gameResult: GameResult | null;
  errorMsg: string | null;
  createRoom: (playerName: string, gameId: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  sendMove: (move: unknown) => void;
  clearError: () => void;
}

const RoomContext = createContext<RoomContextValue>(null!);

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<unknown | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on("room:updated", (r) => setRoom(r));
    socket.on("game:started", (s) => {
      setGameState(s);
      setGameResult(null);
    });
    socket.on("game:stateUpdated", (s) => setGameState(s));
    socket.on("game:ended", (result) => setGameResult(result));
    socket.on("error", (msg) => setErrorMsg(msg));

    return () => {
      socket.off("room:updated");
      socket.off("game:started");
      socket.off("game:stateUpdated");
      socket.off("game:ended");
      socket.off("error");
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string, gameId: string) => {
    socket.emit("room:create", playerName, gameId, (roomCode) => {
      // Room will arrive via room:updated
      // Store playerId — for creator, we need to get it from room:updated
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socket.emit("room:join", roomCode, playerName, (result) => {
      if (!result.ok) {
        setErrorMsg(result.error ?? "参加に失敗しました");
      } else if (result.playerId) {
        setPlayerId(result.playerId);
      }
    });
  }, []);

  // For the room creator, we need to set their playerId from the room info
  useEffect(() => {
    if (room && !playerId && room.players.length > 0) {
      // The first player is the host/creator
      setPlayerId(room.hostId);
    }
  }, [room, playerId]);

  const startGame = useCallback(() => {
    socket.emit("game:start");
  }, []);

  const sendMove = useCallback((move: unknown) => {
    socket.emit("game:move", move);
  }, []);

  const clearError = useCallback(() => setErrorMsg(null), []);

  return (
    <RoomContext.Provider
      value={{
        room,
        playerId,
        gameState,
        gameResult,
        errorMsg,
        createRoom,
        joinRoom,
        startGame,
        sendMove,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
