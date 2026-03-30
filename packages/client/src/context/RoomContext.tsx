import type {
    AiueBattleState,
    BlokusState,
    BlokusTrigonState,
    CiaoCiaoStateView,
    CitychasePlayerView, GameResult, HyperRobotState, NanaStateView,
    NyaMensPlayerView,
    Player,
    RoomInfo, SonicRestaurantState, WsServerMessage
} from "@bodobako/shared";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { wsClient } from "../lib/socket";
import { useAuth } from "./AuthContext";

/**
 * サーバーから受け取る gameState の discriminated union。
 * 各ゲームボードでは `gameState.gameId` で分岐することで `as` キャストが不要になる。
 */
export type GameStateEntry =
  | { gameId: "aiuebattle"; state: AiueBattleState }
  | { gameId: "citychase"; state: CitychasePlayerView }
  | { gameId: "sonic-restaurant"; state: SonicRestaurantState }
  | { gameId: "blokus"; state: BlokusState }
  | { gameId: "blokus-trigon"; state: BlokusTrigonState }
  | { gameId: "ciao-ciao"; state: CiaoCiaoStateView }
  | { gameId: "nana"; state: NanaStateView }
  | { gameId: "nyamens"; state: NyaMensPlayerView }
  | { gameId: "hyper-robot"; state: HyperRobotState };

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
  gameState: GameStateEntry | null;
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
  gameStartCount: number;
  /** game:ended 時点のプレイヤースナップショット（退出後も名前を保持） */
  resultPlayers: Player[] | null;
  /** 退出強制終了の通知メッセージ（5秒後に自動クリア） */
  forfeitNotification: string | null;
  clearForfeitNotification: () => void;
  /** 再戦希望を送ったplayerId一覧（リアルタイム更新） */
  rematchRequests: string[];
  requestRematch: () => void;
}

const RoomContext = createContext<RoomContextValue>(null!);

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { idToken, appDisplayName } = useAuth();
  const idTokenRef = useRef<string | null>(null);
  useEffect(() => { idTokenRef.current = idToken; }, [idToken]);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerNameState] = useState(
    () => localStorage.getItem(STORAGE_KEYS.playerName) ?? ""
  );
  const [gameState, setGameState] = useState<GameStateEntry | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameStartCount, setGameStartCount] = useState(0);
  const [resultPlayers, setResultPlayers] = useState<Player[] | null>(null);
  const [forfeitNotification, setForfeitNotification] = useState<string | null>(null);
  const [rematchRequests, setRematchRequests] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
  /** createRoom 後、room:updated を受け取ったら navigate するためのコード */
  const pendingNavigateRef = useRef<string | null>(null);
  /** イベントハンドラ内で現在の room にアクセスするための ref */
  const roomRef = useRef<RoomInfo | null>(null);
  useEffect(() => { roomRef.current = room; }, [room]);
  /** WS 接続待ちポーリングの interval ID（重複起動防止用） */
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    localStorage.setItem(STORAGE_KEYS.playerName, name);
  }, []);

  // ログイン済みユーザーの appDisplayName を playerName に同期する。
  // localStorage に古い名前があってもログイン後は常に appDisplayName を優先する。
  useEffect(() => {
    if (appDisplayName) setPlayerName(appDisplayName);
  }, [appDisplayName, setPlayerName]);

  const saveRoomSession = useCallback((roomCode: string, pid: string) => {
    localStorage.setItem(STORAGE_KEYS.roomCode, roomCode);
    localStorage.setItem(STORAGE_KEYS.playerId, pid);
  }, []);

  const clearRoomSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.roomCode);
    localStorage.removeItem(STORAGE_KEYS.playerId);
  }, []);

  // iOS bfcache（バック・フォワードキャッシュ）からの復元時に古いWS状態をリセットする。
  // bfcache復元後はネットワークスタックが完全に再初期化される前にfetchが失敗する場合があるため、
  // ロビーにいるとき（room = null）は wsClient を切断して state をクリアする。
  useEffect(() => {
    const handlePageShow = (ev: PageTransitionEvent) => {
      if (!ev.persisted) return;
      // ルームに入っている状態でbfcache復元された場合はRoomPageのconnectToRoomに任せる
      // ロビーにいる場合は古い再接続ループを止める
      if (!room) {
        wsClient.disconnect();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [room]);

  // サーバーからのpushイベント購読
  useEffect(() => {
    const onRoomUpdated = (msg: Extract<WsServerMessage, { type: "room:updated" }>) => {
      // flushSync で setState を即時コミットしてから navigate する。
      // これにより RoomPage マウント時に room が確実にセットされている。
      flushSync(() => {
        setRoom(msg.room);
        setIsCreatingRoom(false);
        setCreatingGameId(null);
      });
      // createRoom 後の room:updated を受け取ったタイミングで navigate（ロビーでロード表示後に遷移）
      if (pendingNavigateRef.current === msg.room.code) {
        pendingNavigateRef.current = null;
        navigate(`/room/${msg.room.code}`);
      }
    };
    const onGameStarted = (msg: Extract<WsServerMessage, { type: "game:started" }>) => {
      const gameId = roomRef.current?.gameId ?? "";
      setGameState({ gameId, state: msg.state } as GameStateEntry);
      setGameResult(null);
      setResultPlayers(null);
      setForfeitNotification(null);
      setRematchRequests([]);
      setGameStartCount((c) => c + 1);
    };
    const onGameStateUpdated = (msg: Extract<WsServerMessage, { type: "game:stateUpdated" }>) => {
      const gameId = roomRef.current?.gameId ?? "";
      setGameState({ gameId, state: msg.state } as GameStateEntry);
    };
    const onGameEnded = (msg: Extract<WsServerMessage, { type: "game:ended" }>) => {
      setGameResult(msg.result);
      setResultPlayers(roomRef.current?.players ?? null);
      if (msg.result.forfeitedBy) {
        setForfeitNotification(`${msg.result.forfeitedBy.name} が退出したため、ゲームが終了しました`);
      }
    };
    const onRoomLeft = (_msg: Extract<WsServerMessage, { type: "room:left" }>) => {
      setRoom(null);
      setPlayerId(null);
      setGameState(null);
      setGameResult(null);
      setResultPlayers(null);
      setForfeitNotification(null);
      clearRoomSession();
      navigate("/");
    };
    const onRematchUpdated = (msg: Extract<WsServerMessage, { type: "game:rematch-updated" }>) => {
      setRematchRequests(msg.playerIds);
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
    wsClient.on("game:rematch-updated", onRematchUpdated);
    wsClient.on("error", onError);

    return () => {
      wsClient.off("room:updated", onRoomUpdated);
      wsClient.off("game:started", onGameStarted);
      wsClient.off("game:stateUpdated", onGameStateUpdated);
      wsClient.off("game:ended", onGameEnded);
      wsClient.off("room:left", onRoomLeft);
      wsClient.off("game:rematch-updated", onRematchUpdated);
      wsClient.off("error", onError);
    };
  }, [clearRoomSession, navigate]);

  const createRoom = useCallback((playerName: string, gameId: string) => {
    const sessionToken = getSessionToken();
    setIsCreatingRoom(true);
    setCreatingGameId(gameId);
    wsClient
      .createRoom({
        playerName,
        gameId,
        sessionToken,
        idToken: idTokenRef.current ?? undefined,
      })
      .then(({ code, playerId: pid }) => {
        setPlayerId(pid);
        saveRoomSession(code, pid);
        // WebSocket接続（セッションは既にDO側で作成済み）
        wsClient.connect(code, sessionToken);
        // navigate は room:updated 受信後に行う（ロビーでロード中モーダルを表示したままにする）
        pendingNavigateRef.current = code;
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
          idToken: idTokenRef.current ?? undefined,
        })
        .then((data) => {
          const alreadyOnPage = window.location.pathname === `/room/${roomCode}`;
          flushSync(() => {
            setPlayerId(data.playerId);
            setRoom(data.room);
          });
          saveRoomSession(roomCode, data.playerId);
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
      if (pollingIntervalRef.current !== null) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(() => {
        waited += 100;
        if (wsClient.connected) {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          tryJoin();
        } else if (waited >= 5000) {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
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
    setResultPlayers(null);
    setForfeitNotification(null);
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
            const gsEntry = data.gameState != null
              ? ({ gameId: data.room.gameId, state: data.gameState } as GameStateEntry)
              : null;
            setGameState(gsEntry);
            setGameResult(data.gameResult ?? null);
            if (data.gameResult) {
              setResultPlayers(data.room.players);
            }
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
        if (pollingIntervalRef.current !== null) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = setInterval(() => {
          waited += 100;
          if (wsClient.connected) {
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
            attemptReconnect();
          } else if (waited >= 2000) {
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
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

  const clearForfeitNotification = useCallback(() => setForfeitNotification(null), []);

  const requestRematch = useCallback(() => {
    wsClient.send({ type: "game:rematch-request" });
    if (playerId) {
      setRematchRequests((prev) => prev.includes(playerId) ? prev : [...prev, playerId]);
    }
  }, [playerId]);

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
        gameStartCount,
        resultPlayers,
        forfeitNotification,
        clearForfeitNotification,
        rematchRequests,
        requestRematch,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}
