import { render, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React, { useEffect } from "react";

// -------------------------------------------------------------------------
// wsClient モック
// -------------------------------------------------------------------------

const mockWsClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  request: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  createRoom: vi.fn(),
  get connected() { return true; },
};

// ハンドラを保存するMap（on/offで登録されたハンドラを追跡）
const eventHandlers = new Map<string, Set<(data: unknown) => void>>();

beforeEach(() => {
  vi.clearAllMocks();
  eventHandlers.clear();

  // on: ハンドラを保存
  (mockWsClient.on as Mock).mockImplementation((type: string, handler: (d: unknown) => void) => {
    if (!eventHandlers.has(type)) eventHandlers.set(type, new Set());
    eventHandlers.get(type)!.add(handler);
  });

  // off: ハンドラを削除
  (mockWsClient.off as Mock).mockImplementation((type: string, handler: (d: unknown) => void) => {
    eventHandlers.get(type)?.delete(handler);
  });

  // localStorage をリセット
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// モジュールをモック
vi.mock("../../lib/socket", () => ({
  wsClient: mockWsClient,
  API_BASE: "http://localhost:8787",
}));

// AuthContext をモック（Firebase 初期化を回避）
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ idToken: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// -------------------------------------------------------------------------
// サーバーイベントシミュレーター
// -------------------------------------------------------------------------

function simulateServerEvent(type: string, data: unknown) {
  const handlers = eventHandlers.get(type);
  if (handlers) {
    for (const handler of handlers) {
      handler(data);
    }
  }
}

// -------------------------------------------------------------------------
// テスト用ヘルパー
// -------------------------------------------------------------------------

// RoomContextを消費するシンプルなコンポーネント
let capturedContext: ReturnType<typeof import("../../context/RoomContext.js")["useRoom"]> | null = null;

function TestConsumer() {
  const room = import("../../context/RoomContext.js");
  return null;
}

// モジュールを直接インポートしてテスト
async function renderRoomProvider() {
  const { RoomProvider, useRoom } = await import("../../context/RoomContext.js");

  let contextValue: ReturnType<typeof useRoom> | null = null;

  function ContextCapture() {
    contextValue = useRoom();
    return null;
  }

  const result = render(
    <MemoryRouter initialEntries={["/"]}>
      <RoomProvider>
        <ContextCapture />
      </RoomProvider>
    </MemoryRouter>
  );

  return { result, getContext: () => contextValue! };
}

// -------------------------------------------------------------------------
// テスト本体
// -------------------------------------------------------------------------

describe("setPlayerName", () => {
  it("playerNameが更新されてlocalStorageに保存される", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().setPlayerName("Alice");
    });

    expect(getContext().playerName).toBe("Alice");
    expect(localStorage.getItem("bodobako:playerName")).toBe("Alice");
  });
});

describe("createRoom", () => {
  it("wsClient.createRoomを呼び出す", async () => {
    (mockWsClient.createRoom as Mock).mockResolvedValue({ code: "ABCD", playerId: "p1" });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "othello");
    });

    await waitFor(() => {
      expect(mockWsClient.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({ playerName: "Alice", gameId: "othello" })
      );
    });
  });

  it("createRoom成功後にwsClient.connectが呼ばれる", async () => {
    (mockWsClient.createRoom as Mock).mockResolvedValue({ code: "ABCD", playerId: "p1" });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "othello");
    });

    await waitFor(() => {
      expect(mockWsClient.connect).toHaveBeenCalledWith("ABCD", expect.any(String));
    });
  });

  it("createRoom失敗時にerrorMsgが設定される", async () => {
    (mockWsClient.createRoom as Mock).mockRejectedValue(new Error("サーバーエラー"));

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "othello");
    });

    await waitFor(() => {
      expect(getContext().errorMsg).toBe("サーバーエラー");
    });
  });

  it("createRoom中はisCreatingRoom=trueになる", async () => {
    // Promiseが解決しないままにする
    let resolveCreate: ((v: unknown) => void) | null = null;
    (mockWsClient.createRoom as Mock).mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; })
    );

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "othello");
    });

    expect(getContext().isCreatingRoom).toBe(true);

    // resolveして後片付け
    await act(async () => {
      resolveCreate?.({ code: "ABCD", playerId: "p1" });
    });
  });
});

describe("leaveRoom", () => {
  it("wsClient.sendとwsClient.disconnectを呼び出す", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().leaveRoom();
    });

    expect(mockWsClient.send).toHaveBeenCalledWith({ type: "room:leave" });
    expect(mockWsClient.disconnect).toHaveBeenCalled();
  });

  it("leaveRoom後にroomがnullになる", async () => {
    const { getContext } = await renderRoomProvider();

    // roomを設定
    act(() => {
      simulateServerEvent("room:updated", {
        type: "room:updated",
        room: { code: "ABCD", gameId: "othello", players: [], hostId: "p1", status: "waiting", gameState: null },
      });
    });

    act(() => {
      getContext().leaveRoom();
    });

    expect(getContext().room).toBeNull();
  });
});

describe("proceedLeave", () => {
  it("navigateせずにWS切断と状態クリアをする", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().proceedLeave();
    });

    expect(mockWsClient.send).toHaveBeenCalledWith({ type: "room:leave" });
    expect(mockWsClient.disconnect).toHaveBeenCalled();
    expect(getContext().room).toBeNull();
  });
});

describe("サーバーイベント - room:updated", () => {
  it("room:updatedイベントでroomが更新される", async () => {
    const { getContext } = await renderRoomProvider();

    const roomData = {
      code: "ABCD",
      gameId: "othello",
      players: [{ id: "p1", name: "Alice" }],
      hostId: "p1",
      status: "waiting" as const,
      gameState: null,
    };

    act(() => {
      simulateServerEvent("room:updated", {
        type: "room:updated",
        room: roomData,
      });
    });

    expect(getContext().room).toEqual(roomData);
  });

  it("room:updatedイベントでisCreatingRoomがfalseになる", async () => {
    let resolveCreate: ((v: unknown) => void) | null = null;
    (mockWsClient.createRoom as Mock).mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; })
    );

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "othello");
    });
    expect(getContext().isCreatingRoom).toBe(true);

    await act(async () => {
      resolveCreate?.({ code: "ABCD", playerId: "p1" });
    });

    act(() => {
      simulateServerEvent("room:updated", {
        type: "room:updated",
        room: { code: "ABCD", gameId: "othello", players: [], hostId: "p1", status: "waiting", gameState: null },
      });
    });

    expect(getContext().isCreatingRoom).toBe(false);
  });
});

describe("サーバーイベント - game:started / game:stateUpdated / game:ended", () => {
  it("game:startedでgameStateが設定される", async () => {
    const { getContext } = await renderRoomProvider();

    const mockState = { board: [], currentPlayerIndex: 0 };
    act(() => {
      simulateServerEvent("game:started", { type: "game:started", state: mockState });
    });

    expect(getContext().gameState).toEqual(mockState);
    expect(getContext().gameResult).toBeNull();
  });

  it("game:stateUpdatedでgameStateが更新される", async () => {
    const { getContext } = await renderRoomProvider();

    const newState = { board: [["black"]], currentPlayerIndex: 1 };
    act(() => {
      simulateServerEvent("game:stateUpdated", { type: "game:stateUpdated", state: newState });
    });

    expect(getContext().gameState).toEqual(newState);
  });

  it("game:endedでgameResultが設定される", async () => {
    const { getContext } = await renderRoomProvider();

    const result = { ranking: ["p1", "p2"], scores: {} };
    act(() => {
      simulateServerEvent("game:ended", { type: "game:ended", result });
    });

    expect(getContext().gameResult).toEqual(result);
  });
});

describe("サーバーイベント - room:left", () => {
  it("room:leftでroomがnullになる", async () => {
    const { getContext } = await renderRoomProvider();

    // まずroomを設定
    act(() => {
      simulateServerEvent("room:updated", {
        type: "room:updated",
        room: { code: "ABCD", gameId: "othello", players: [], hostId: "p1", status: "waiting", gameState: null },
      });
    });

    act(() => {
      simulateServerEvent("room:left", { type: "room:left" });
    });

    expect(getContext().room).toBeNull();
    expect(getContext().gameState).toBeNull();
    expect(getContext().gameResult).toBeNull();
  });
});

describe("サーバーイベント - error", () => {
  it("errorイベントでerrorMsgが設定される", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      simulateServerEvent("error", { type: "error", message: "ルームが満員です" });
    });

    expect(getContext().errorMsg).toBe("ルームが満員です");
  });
});

describe("clearError", () => {
  it("clearErrorでerrorMsgがnullになる", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      simulateServerEvent("error", { type: "error", message: "エラー" });
    });
    expect(getContext().errorMsg).toBe("エラー");

    act(() => {
      getContext().clearError();
    });
    expect(getContext().errorMsg).toBeNull();
  });
});

describe("startGame / sendMove", () => {
  it("startGameでgame:startメッセージを送信する", async () => {
    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().startGame();
    });

    expect(mockWsClient.send).toHaveBeenCalledWith({ type: "game:start" });
  });

  it("sendMoveでgame:moveメッセージを送信する", async () => {
    const { getContext } = await renderRoomProvider();
    const move = { row: 2, col: 3 };

    act(() => {
      getContext().sendMove(move);
    });

    expect(mockWsClient.send).toHaveBeenCalledWith({ type: "game:move", move });
  });
});

describe("localStorageからのplayerName初期化", () => {
  it("localStorageにplayerNameがあれば初期値として使用される", async () => {
    localStorage.setItem("bodobako:playerName", "Bob");

    const { getContext } = await renderRoomProvider();

    expect(getContext().playerName).toBe("Bob");
  });
});

describe("joinRoom", () => {
  const roomData = {
    code: "ABCD",
    gameId: "othello",
    players: [
      { id: "p1", name: "Alice" },
      { id: "p2", name: "Bob" },
    ],
    hostId: "p1",
    status: "waiting" as const,
    gameState: null,
  };

  it("成功時にroom・playerIdが設定される", async () => {
    (mockWsClient.request as Mock).mockResolvedValue({
      room: roomData,
      playerId: "p2",
    });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().joinRoom("ABCD", "Bob");
    });

    await waitFor(() => {
      expect(getContext().room).toEqual(roomData);
      expect(getContext().playerId).toBe("p2");
    });

    expect(mockWsClient.connect).toHaveBeenCalledWith("ABCD", expect.any(String));
    expect(mockWsClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ type: "room:join", roomCode: "ABCD", playerName: "Bob" })
    );
  });

  it("失敗時にerrorMsgが設定されdisconnectが呼ばれる", async () => {
    (mockWsClient.request as Mock).mockRejectedValue(new Error("ルームが満員です"));

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().joinRoom("ABCD", "Bob");
    });

    await waitFor(() => {
      expect(getContext().errorMsg).toBe("ルームが満員です");
    });

    expect(mockWsClient.disconnect).toHaveBeenCalled();
  });
});

describe("connectToRoom", () => {
  const roomData = {
    code: "ABCD",
    gameId: "othello",
    players: [{ id: "p1", name: "Alice" }],
    hostId: "p1",
    status: "waiting" as const,
    gameState: null,
  };

  it("sessionTokenがある場合はsession:reconnectを試みる", async () => {
    localStorage.setItem("bodobako:sessionToken", "tok-123");
    (mockWsClient.request as Mock).mockResolvedValue({
      room: roomData,
      playerId: "p1",
      gameState: null,
      gameResult: null,
    });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().connectToRoom("ABCD", "Alice");
    });

    await waitFor(() => {
      expect(getContext().room).toEqual(roomData);
      expect(getContext().playerId).toBe("p1");
    });

    expect(mockWsClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ type: "session:reconnect", sessionToken: "tok-123" })
    );
  });

  it("session:reconnect失敗時はjoinRoomにフォールバックする", async () => {
    localStorage.setItem("bodobako:sessionToken", "tok-123");
    const joinRoomData = {
      ...roomData,
      players: [{ id: "p1", name: "Alice" }, { id: "p2", name: "Bob" }],
    };
    (mockWsClient.request as Mock)
      .mockRejectedValueOnce(new Error("セッションが見つかりません"))
      .mockResolvedValueOnce({ room: joinRoomData, playerId: "p2" });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().connectToRoom("ABCD", "Bob");
    });

    await waitFor(() => {
      expect(getContext().room).toEqual(joinRoomData);
    });

    expect(mockWsClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ type: "session:reconnect" })
    );
    expect(mockWsClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ type: "room:join", roomCode: "ABCD" })
    );
  });

  it("sessionTokenがない場合はjoinRoomを直接呼ぶ", async () => {
    // beforeEach で localStorage.clear() 済み → sessionToken なし
    (mockWsClient.request as Mock).mockResolvedValue({
      room: roomData,
      playerId: "p1",
    });

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().connectToRoom("ABCD", "Alice");
    });

    await waitFor(() => {
      expect(mockWsClient.request).toHaveBeenCalledWith(
        expect.objectContaining({ type: "room:join" })
      );
    });

    expect(mockWsClient.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "session:reconnect" })
    );
  });
});

describe("bfcache (pageshow) 復元", () => {
  // happy-dom では PageTransitionEvent の persisted オプションが未サポートのため
  // Object.assign でプロパティを付与したイベントを使用する
  function makePageShowEvent(persisted: boolean): Event {
    return Object.assign(new Event("pageshow"), { persisted });
  }

  it("pageshow(persisted=true)かつroom=nullのときwsClient.disconnectが呼ばれる", async () => {
    await renderRoomProvider();

    act(() => {
      window.dispatchEvent(makePageShowEvent(true));
    });

    expect(mockWsClient.disconnect).toHaveBeenCalled();
  });

  it("pageshow(persisted=false)のときwsClient.disconnectは呼ばれない", async () => {
    await renderRoomProvider();

    act(() => {
      window.dispatchEvent(makePageShowEvent(false));
    });

    expect(mockWsClient.disconnect).not.toHaveBeenCalled();
  });

  it("pageshow(persisted=true)かつroomが設定済みのときwsClient.disconnectは呼ばれない", async () => {
    const { getContext } = await renderRoomProvider();

    // room を設定する
    act(() => {
      simulateServerEvent("room:updated", {
        type: "room:updated",
        room: { code: "ABCD", gameId: "othello", players: [], hostId: "p1", status: "waiting", gameState: null },
      });
    });

    vi.clearAllMocks(); // room 設定前の呼び出しをリセット

    act(() => {
      window.dispatchEvent(makePageShowEvent(true));
    });

    expect(mockWsClient.disconnect).not.toHaveBeenCalled();
  });
});

describe("creatingGameId", () => {
  it("createRoom中はcreatingGameIdにgameIdが設定される", async () => {
    let resolveCreate: ((v: unknown) => void) | null = null;
    (mockWsClient.createRoom as Mock).mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; })
    );

    const { getContext } = await renderRoomProvider();

    act(() => {
      getContext().createRoom("Alice", "aiuebattle");
    });

    expect(getContext().creatingGameId).toBe("aiuebattle");

    // cleanup
    await act(async () => {
      resolveCreate?.({ code: "ABCD", playerId: "p1" });
    });
  });
});
