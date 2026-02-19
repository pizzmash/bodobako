import type { GameResult, RoomInfo, WsServerMessage } from "@bodobako/shared";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
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
  /** ルームを退出してURLをルートに戻す（Room.tsx 等の退出ボタン用） */
  leaveRoom: () => void;
  /** WS切断＋状態クリアのみ（navigate なし）。useBlocker で proceed する際に使用 */
  proceedLeave: () => void;
  /** URL の :code を元にセッション再接続 → 失敗時は joinRoom にフォールバック */
  connectToRoom: (code: string, playerName: string) => void;
  startGame: () => void;
  sendMove: (move: unknown) => void;
  clearError: () => void;
}

const RoomContext = createContext<RoomContextValue>(null!);

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
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
      navigate("/");
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
  }, [clearRoomSession, navigate]);

  const createRoom = useCallback((playerName: string, gameId: string) => {
    const sessionToken = getSessionToken();
    setIsCreatingRoom(true);
    setCreatingGameId(gameId);
    wsClient
      .createRoom({ playerName, gameId, sessionToken })
      .then(({ code, playerId: pid }) => {
        setPlayerId(pid);
        saveRoomSession(code, pid);
        // WebSocket接続（セッションは既にDO側で作成済み）
        wsClient.connect(code, sessionToken);
        navigate(`/room/${code}`);
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
  }, [saveRoomSession, navigate]);

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
          const alreadyOnPage = window.location.pathname === `/room/${roomCode}`;
          navigate(`/room/${roomCode}`, { replace: alreadyOnPage });
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
  }, [saveRoomSession, navigate]);

  // ルーム作成者のplayerId設定（room:updatedで初回取得時）
  useEffect(() => {
    if (room && !playerId && room.players.length > 0) {
      setPlayerId(room.hostId);
      saveRoomSession(room.code, room.hostId);
    }
  }, [room, playerId, saveRoomSession]);

  /** ナビゲートなしでルーム状態をクリア（useBlocker の proceed 前に呼ぶ用） */
  const proceedLeave = useCallback(() => {
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

  /** ルームを退出して / へ戻る */
  const leaveRoom = useCallback(() => {
    proceedLeave();
    navigate("/");
  }, [proceedLeave, navigate]);

  /**
   * /room/:code ページがマウントされた際に呼ぶ。
   * localStorage のセッショントークンで再接続を試み、
   * 失敗した場合は joinRoom にフォールバックする。
   */
  const connectToRoom = useCallback(
    (code: string, pName: string) => {
      const sessionToken = localStorage.getItem(STORAGE_KEYS.sessionToken);

      const doJoin = () => joinRoom(code, pName);

      if (!sessionToken) {
        doJoin();
        return;
      }

      // セッション再接続を試みる
      wsClient.connect(code, sessionToken);

      const reqId = crypto.randomUUID();
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
            saveRoomSession(code, data.playerId);
          })
          .catch(() => {
            wsClient.disconnect();
            clearRoomSession();
            doJoin();
          });
      };

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
            doJoin();
          }
        }, 100);
      }
    },
    [saveRoomSession, clearRoomSession, joinRoom],
  );

  const startGame = useCallback(() => {
    wsClient.send({ type: "game:start" });
  }, []);

  const sendMove = useCallback((move: unknown) => {
    wsClient.send({ type: "game:move", move });
  }, []);

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
        leaveRoom,
        proceedLeave,
        connectToRoom,
        startGame,
        sendMove,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
