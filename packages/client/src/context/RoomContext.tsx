import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { RoomInfo, GameResult } from "@bodobako/shared";
import { socket } from "../lib/socket";

const STORAGE_KEYS = {
  sessionToken: "bodobako:sessionToken",
  playerName: "bodobako:playerName",
  roomCode: "bodobako:roomCode",
  playerId: "bodobako:playerId",
} as const;

function getSessionToken(): string {
  let token = localStorage.getItem(STORAGE_KEYS.sessionToken);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.sessionToken, token);
  }
  return token;
}

interface RoomContextValue {
  room: RoomInfo | null;
  playerId: string | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  gameState: unknown | null;
  gameResult: GameResult | null;
  errorMsg: string | null;
  createRoom: (playerName: string, gameId: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  sendMove: (move: unknown) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

const RoomContext = createContext<RoomContextValue>(null!);

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState(
    () => localStorage.getItem(STORAGE_KEYS.playerName) ?? ""
  );
  const [gameState, setGameState] = useState<unknown | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const reconnectAttempted = useRef(false);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    localStorage.setItem(STORAGE_KEYS.playerName, name);
  }, []);

  const saveRoomSession = useCallback((roomCode: string, pid: string) => {
    localStorage.setItem(STORAGE_KEYS.roomCode, roomCode);
    localStorage.setItem(STORAGE_KEYS.playerId, pid);
  }, []);

  const clearRoomSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.roomCode);
    localStorage.removeItem(STORAGE_KEYS.playerId);
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on("room:updated", (r) => setRoom(r));
    socket.on("game:started", (s) => {
      setGameState(s);
      setGameResult(null);
    });
    socket.on("game:stateUpdated", (s) => setGameState(s));
    socket.on("game:ended", (result) => setGameResult(result));
    socket.on("room:left", () => {
      setRoom(null);
      setPlayerId(null);
      setGameState(null);
      setGameResult(null);
      clearRoomSession();
    });
    socket.on("error", (msg) => setErrorMsg(msg));

    return () => {
      socket.off("room:updated");
      socket.off("game:started");
      socket.off("game:stateUpdated");
      socket.off("game:ended");
      socket.off("room:left");
      socket.off("error");
      socket.disconnect();
    };
  }, [clearRoomSession]);

  // Reconnect on mount
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    const sessionToken = localStorage.getItem(STORAGE_KEYS.sessionToken);
    const savedRoomCode = localStorage.getItem(STORAGE_KEYS.roomCode);
    if (!sessionToken || !savedRoomCode) return;

    const attemptReconnect = () => {
      socket.emit("session:reconnect", sessionToken, (result) => {
        if (result.success && result.room && result.playerId) {
          setRoom(result.room);
          setPlayerId(result.playerId);
          setGameState(result.gameState ?? null);
          setGameResult(result.gameResult ?? null);
        } else {
          clearRoomSession();
        }
      });
    };

    if (socket.connected) {
      attemptReconnect();
    } else {
      socket.once("connect", attemptReconnect);
    }
  }, [clearRoomSession]);

  const createRoom = useCallback((playerName: string, gameId: string) => {
    const sessionToken = getSessionToken();
    socket.emit("room:create", playerName, gameId, sessionToken, (roomCode) => {
      // Room will arrive via room:updated
      // Save room session info once we get the room:updated
      localStorage.setItem(STORAGE_KEYS.roomCode, roomCode);
    });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const sessionToken = getSessionToken();
    socket.emit("room:join", roomCode, playerName, sessionToken, (result) => {
      if (!result.ok) {
        setErrorMsg(result.error ?? "参加に失敗しました");
      } else if (result.playerId) {
        setPlayerId(result.playerId);
        saveRoomSession(roomCode, result.playerId);
      }
    });
  }, [saveRoomSession]);

  // For the room creator, we need to set their playerId from the room info
  useEffect(() => {
    if (room && !playerId && room.players.length > 0) {
      // The first player is the host/creator
      setPlayerId(room.hostId);
      saveRoomSession(room.code, room.hostId);
    }
  }, [room, playerId, saveRoomSession]);

  const startGame = useCallback(() => {
    socket.emit("game:start");
  }, []);

  const sendMove = useCallback((move: unknown) => {
    socket.emit("game:move", move);
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit("room:leave");
    setRoom(null);
    setPlayerId(null);
    setGameState(null);
    setGameResult(null);
    clearRoomSession();
  }, [clearRoomSession]);

  const clearError = useCallback(() => setErrorMsg(null), []);

  return (
    <RoomContext.Provider
      value={{
        room,
        playerId,
        playerName,
        setPlayerName,
        gameState,
        gameResult,
        errorMsg,
        createRoom,
        joinRoom,
        startGame,
        sendMove,
        leaveRoom,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
