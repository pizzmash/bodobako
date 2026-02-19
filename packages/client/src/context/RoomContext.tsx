import type { GameResult, RoomInfo, WsServerMessage } from "@bodobako/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { wsClient } from "../lib/socket";

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
  isCreatingRoom: boolean;
  creatingGameId: string | null;
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
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
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

  // サーバーからのpushイベント購読
  useEffect(() => {
    const onRoomUpdated = (msg: Extract<WsServerMessage, { type: "room:updated" }>) => {
      setRoom(msg.room);
      setIsCreatingRoom(false);
      setCreatingGameId(null);
    };
    const onGameStarted = (msg: Extract<WsServerMessage, { type: "game:started" }>) => {
      setGameState(msg.state);
      setGameResult(null);
    };
    const onGameStateUpdated = (msg: Extract<WsServerMessage, { type: "game:stateUpdated" }>) => {
      setGameState(msg.state);
    };
    const onGameEnded = (msg: Extract<WsServerMessage, { type: "game:ended" }>) => {
      setGameResult(msg.result);
    };
    const onRoomLeft = (_msg: Extract<WsServerMessage, { type: "room:left" }>) => {
      setRoom(null);
      setPlayerId(null);
      setGameState(null);
      setGameResult(null);
      clearRoomSession();
    };
    const onError = (msg: Extract<WsServerMessage, { type: "error" }>) => {
      setErrorMsg(msg.message);
      setIsCreatingRoom(false);
      setCreatingGameId(null);
    };

    wsClient.on("room:updated", onRoomUpdated);
    wsClient.on("game:started", onGameStarted);
    wsClient.on("game:stateUpdated", onGameStateUpdated);
    wsClient.on("game:ended", onGameEnded);
    wsClient.on("room:left", onRoomLeft);
    wsClient.on("error", onError);

    return () => {
      wsClient.off("room:updated", onRoomUpdated);
      wsClient.off("game:started", onGameStarted);
      wsClient.off("game:stateUpdated", onGameStateUpdated);
      wsClient.off("game:ended", onGameEnded);
      wsClient.off("room:left", onRoomLeft);
      wsClient.off("error", onError);
    };
  }, [clearRoomSession]);

  // ページロード時のセッション再接続
  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    const sessionToken = localStorage.getItem(STORAGE_KEYS.sessionToken);
    const savedRoomCode = localStorage.getItem(STORAGE_KEYS.roomCode);
    if (!sessionToken || !savedRoomCode) return;

    // WebSocket接続してsession:reconnectを送信
    wsClient.connect(savedRoomCode, sessionToken);

    const reqId = crypto.randomUUID();
    // 接続完立後に送信するため少し待つ
    const attemptReconnect = () => {
      wsClient
        .request<{
          room: RoomInfo;
          playerId: string;
          gameState: unknown | null;
          gameResult: GameResult | null;
        }>({ type: "session:reconnect", reqId, sessionToken })
        .then((data) => {
          setRoom(data.room);
          setPlayerId(data.playerId);
          setGameState(data.gameState ?? null);
          setGameResult(data.gameResult ?? null);
          saveRoomSession(savedRoomCode, data.playerId);
        })
        .catch((err: unknown) => {
          wsClient.disconnect();
          clearRoomSession();
          console.warn("[RoomContext] セッション再接続に失敗しました:", err);
        });
    };

    // wsClientが接続されるまで待機（最大2秒）
    if (wsClient.connected) {
      attemptReconnect();
    } else {
      let waited = 0;
      const interval = setInterval(() => {
        waited += 100;
        if (wsClient.connected) {
          clearInterval(interval);
          attemptReconnect();
        } else if (waited >= 2000) {
          clearInterval(interval);
          wsClient.disconnect();
          clearRoomSession();
        }
      }, 100);
    }
  }, [saveRoomSession, clearRoomSession]);

  const createRoom = useCallback((playerName: string, gameId: string) => {
    const sessionToken = getSessionToken();
    setIsCreatingRoom(true);
    setCreatingGameId(gameId);
    wsClient
      .createRoom({ playerName, gameId, sessionToken })
      .then(({ code, playerId: pid }) => {
        localStorage.setItem(STORAGE_KEYS.roomCode, code);
        setPlayerId(pid);
        saveRoomSession(code, pid);
        // WebSocket接続（セッションは既にDO側で作成済み）
        wsClient.connect(code, sessionToken);
      })
      .catch((err: unknown) => {
        setIsCreatingRoom(false);
        setCreatingGameId(null);
        const msg =
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message ?? "ルーム作成に失敗しました"
              : "ルーム作成に失敗しました";
        setErrorMsg(msg);
      });
  }, [saveRoomSession]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const sessionToken = getSessionToken();
    const reqId = crypto.randomUUID();

    // まずWS接続してからroom:joinメッセージを送る
    wsClient.connect(roomCode, sessionToken);

    const tryJoin = () => {
      wsClient
        .request<{ room: RoomInfo; playerId: string }>({
          type: "room:join",
          reqId,
          roomCode,
          playerName,
          sessionToken,
        })
        .then((data) => {
          setPlayerId(data.playerId);
          setRoom(data.room);
          saveRoomSession(roomCode, data.playerId);
        })
        .catch((err: unknown) => {
          wsClient.disconnect();
          const msg =
            typeof err === "string"
              ? err
              : err instanceof Error
                ? err.message
                : "参加に失敗しました";
          setErrorMsg(msg);
        });
    };

    if (wsClient.connected) {
      tryJoin();
    } else {
      let waited = 0;
      const interval = setInterval(() => {
        waited += 100;
        if (wsClient.connected) {
          clearInterval(interval);
          tryJoin();
        } else if (waited >= 5000) {
          clearInterval(interval);
          wsClient.disconnect();
          setErrorMsg("接続タイムアウトしました");
        }
      }, 100);
    }
  }, [saveRoomSession]);

  // ルーム作成者のplayerId設定（room:updatedで初回取得時）
  useEffect(() => {
    if (room && !playerId && room.players.length > 0) {
      setPlayerId(room.hostId);
      saveRoomSession(room.code, room.hostId);
    }
  }, [room, playerId, saveRoomSession]);

  const startGame = useCallback(() => {
    wsClient.send({ type: "game:start" });
  }, []);

  const sendMove = useCallback((move: unknown) => {
    wsClient.send({ type: "game:move", move });
  }, []);

  const leaveRoom = useCallback(() => {
    wsClient.send({ type: "room:leave" });
    wsClient.disconnect();
    setRoom(null);
    setPlayerId(null);
    setGameState(null);
    setGameResult(null);
    setIsCreatingRoom(false);
    setCreatingGameId(null);
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
        isCreatingRoom,
        creatingGameId,
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
