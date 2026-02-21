import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// -------------------------------------------------------------------------
// MockWebSocket
// -------------------------------------------------------------------------

type MockWsInstance = {
  url: string;
  readyState: number;
  sentMessages: string[];
  onopen: ((ev: Event) => void) | null;
  onclose: ((ev: CloseEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onmessage: ((ev: MessageEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  simulateOpen(): void;
  simulateMessage(data: object): void;
  simulateClose(code?: number): void;
  simulateError(): void;
};

let latestMockWs: MockWsInstance | null = null;

class MockWebSocket implements MockWsInstance {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static CONNECTING = 0;

  url: string;
  readyState = MockWebSocket.OPEN; // デフォルトは接続済み状態
  sentMessages: string[] = [];
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    latestMockWs = this;
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  // --- テストヘルパー ---

  simulateOpen(): void {
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateClose(code = 1001): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }

  simulateError(): void {
    this.onerror?.(new Event("error"));
  }
}

// -------------------------------------------------------------------------
// テスト本体
// -------------------------------------------------------------------------

// wsClientはモジュールレベルのシングルトンなので、各テストでdisconnect()してリセット
let wsClient: Awaited<typeof import("../socket.js")>["wsClient"];

beforeEach(async () => {
  vi.stubGlobal("WebSocket", MockWebSocket);
  latestMockWs = null;
  // モジュールのキャッシュを避けるため動的importを使用
  const mod = await import("../socket.js");
  wsClient = mod.wsClient;
  // 前のテストの状態をリセット
  wsClient.disconnect();
});

afterEach(() => {
  wsClient.disconnect();
  vi.unstubAllGlobals();
});

describe("connect", () => {
  it("正しいURLでWebSocketを作成する", () => {
    wsClient.connect("ABCD", "session-token-123");
    expect(latestMockWs).not.toBeNull();
    expect(latestMockWs!.url).toContain("/rooms/ABCD/ws");
    expect(latestMockWs!.url).toContain("sessionToken=session-token-123");
  });

  it("接続後はconnected=true（readyState=OPEN）", () => {
    wsClient.connect("ABCD", "token");
    latestMockWs!.readyState = MockWebSocket.OPEN;
    expect(wsClient.connected).toBe(true);
  });

  it("未接続状態ではconnected=false", () => {
    expect(wsClient.connected).toBe(false);
  });

  it("接続中に再度 connect() を呼ぶと古い WS が閉じられる", () => {
    wsClient.connect("ABCD", "token");
    const firstWs = latestMockWs!;

    wsClient.connect("XYZW", "new-token");

    // 古い WS が close() されている
    expect(firstWs.readyState).toBe(MockWebSocket.CLOSED);
    // 新しい WS が作られている
    expect(latestMockWs).not.toBe(firstWs);
    expect(latestMockWs!.url).toContain("/rooms/XYZW/ws");
  });

  it("再接続タイマーが発火する前に connect() を呼ぶとタイマーがキャンセルされる", async () => {
    vi.useFakeTimers();
    try {
      wsClient.connect("ABCD", "token");
      const firstWs = latestMockWs!;

      // 意図しない切断 → 再接続タイマーが設定される（まだ発火しない）
      firstWs.simulateClose(1001);

      // タイマーが発火する前に別の部屋へ connect()
      wsClient.connect("XYZW", "new-token");
      const secondWs = latestMockWs!;
      expect(secondWs).not.toBe(firstWs);

      // 時間を十分進めても余分な WS は作成されない（古いタイマーがキャンセル済み）
      await vi.advanceTimersByTimeAsync(5000);
      expect(latestMockWs).toBe(secondWs);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("disconnect", () => {
  it("disconnect後はconnected=false", () => {
    wsClient.connect("ABCD", "token");
    wsClient.disconnect();
    expect(wsClient.connected).toBe(false);
  });

  it("disconnect時にpendingのrequestがrejectされる", async () => {
    wsClient.connect("ABCD", "token");
    const reqId = "test-req-id";
    const promise = wsClient.request({ type: "room:join", reqId, playerName: "test" });

    wsClient.disconnect();

    await expect(promise).rejects.toMatch(/切断/);
  });
});

describe("send", () => {
  it("接続中はメッセージを送信できる", () => {
    wsClient.connect("ABCD", "token");
    wsClient.send({ type: "room:leave" });
    expect(latestMockWs!.sentMessages).toHaveLength(1);
    expect(JSON.parse(latestMockWs!.sentMessages[0])).toMatchObject({ type: "room:leave" });
  });

  it("未接続状態ではsendは無視される（エラーにならない）", () => {
    // 接続せずにsend
    expect(() => wsClient.send({ type: "room:leave" })).not.toThrow();
  });
});

describe("request", () => {
  it("reqId付きメッセージを送信し、ack(ok)で解決する", async () => {
    wsClient.connect("ABCD", "token");
    const reqId = "req-001";

    const promise = wsClient.request({ type: "room:join", reqId, playerName: "testUser" });

    // ack(ok)を受信
    latestMockWs!.simulateMessage({
      type: "ack",
      reqId,
      ok: true,
      data: { room: { code: "ABCD" } },
    });

    const result = await promise;
    expect(result).toMatchObject({ room: { code: "ABCD" } });
  });

  it("ack(error)でrejectされる", async () => {
    wsClient.connect("ABCD", "token");
    const reqId = "req-002";

    const promise = wsClient.request({ type: "room:join", reqId, playerName: "testUser" });

    // ack(error)を受信
    latestMockWs!.simulateMessage({
      type: "ack",
      reqId,
      ok: false,
      error: "ルームが見つかりません",
    });

    await expect(promise).rejects.toBe("ルームが見つかりません");
  });

  it("未接続状態ではrequestがrejectされる", async () => {
    await expect(
      wsClient.request({ type: "room:join", reqId: "req-x", playerName: "test" })
    ).rejects.toMatch(/接続/);
  });

  it("複数の同時リクエストがそれぞれ正しく解決される", async () => {
    wsClient.connect("ABCD", "token");
    const ws = latestMockWs!;

    const p1 = wsClient.request({ type: "room:join", reqId: "req-A", playerName: "Alice" });
    const p2 = wsClient.request({ type: "room:join", reqId: "req-B", playerName: "Bob" });

    // B を先に解決、A を後に解決（順序が入れ替わっても正しく解決されることを検証）
    ws.simulateMessage({ type: "ack", reqId: "req-B", ok: true, data: "dataB" });
    ws.simulateMessage({ type: "ack", reqId: "req-A", ok: true, data: "dataA" });

    const [resultA, resultB] = await Promise.all([p1, p2]);
    expect(resultA).toBe("dataA");
    expect(resultB).toBe("dataB");
  });

  it("10秒後にタイムアウトでrejectされる", async () => {
    vi.useFakeTimers();
    try {
      wsClient.connect("ABCD", "token");

      const promise = wsClient.request({
        type: "room:join",
        reqId: "req-timeout",
        playerName: "test",
      });

      // rejectハンドラを先に登録してから時間を進める（unhandled rejection防止）
      const assertion = expect(promise).rejects.toMatch(/タイムアウト/);
      await vi.advanceTimersByTimeAsync(10_001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("on / off / once", () => {
  it("on()でイベントハンドラが登録される", () => {
    wsClient.connect("ABCD", "token");
    const handler = vi.fn();
    wsClient.on("room:updated", handler);

    latentMockWs_simulateRoomUpdated();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("off()でイベントハンドラが解除される", () => {
    wsClient.connect("ABCD", "token");
    const handler = vi.fn();
    wsClient.on("room:updated", handler);
    wsClient.off("room:updated", handler);

    latentMockWs_simulateRoomUpdated();

    expect(handler).not.toHaveBeenCalled();
  });

  it("once()でハンドラが1回だけ呼ばれる", () => {
    wsClient.connect("ABCD", "token");
    const handler = vi.fn();
    wsClient.once("room:updated", handler);

    latentMockWs_simulateRoomUpdated();
    latentMockWs_simulateRoomUpdated(); // 2回目

    expect(handler).toHaveBeenCalledTimes(1); // 1回のみ
  });
});

function latentMockWs_simulateRoomUpdated() {
  latestMockWs!.simulateMessage({
    type: "room:updated",
    room: {
      code: "ABCD",
      gameId: "othello",
      players: [],
      hostId: "p1",
      status: "waiting",
      gameState: null,
    },
  });
}

describe("自動再接続", () => {
  it("意図しない切断後に再接続をスケジュールする", async () => {
    vi.useFakeTimers();
    wsClient.connect("ABCD", "token");
    const firstWs = latestMockWs!;

    // 意図しない切断（manualClose=false）
    firstWs.simulateClose(1001);

    // 再接続タイマーが発火するまで待つ
    await vi.advanceTimersByTimeAsync(2000);

    // 新しいWebSocketが作成される
    expect(latestMockWs).not.toBe(firstWs);
    vi.useRealTimers();
  });

  it("disconnect()後は再接続しない（manualClose=true）", async () => {
    vi.useFakeTimers();
    wsClient.connect("ABCD", "token");
    const firstWs = latestMockWs!;

    wsClient.disconnect();

    // 十分な時間が経過しても再接続しない
    await vi.advanceTimersByTimeAsync(5000);
    expect(latestMockWs).toBe(firstWs); // 新しいWSが作られない

    vi.useRealTimers();
  });
});

describe("createRoom (HTTP API)", () => {
  it("POST /rooms にJSONを送信し、codeとplayerIdを返す", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: "ABCD", playerId: "player-1" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await wsClient.createRoom({
      playerName: "Alice",
      gameId: "othello",
      sessionToken: "token-abc",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/rooms"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Alice"),
      })
    );
    expect(result).toEqual({ code: "ABCD", playerId: "player-1" });
  });

  it("レスポンスがエラーの場合はErrorをthrowする", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "ゲームが見つかりません" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      wsClient.createRoom({ playerName: "Alice", gameId: "invalid", sessionToken: "token" })
    ).rejects.toThrow("ゲームが見つかりません");
  });

  it("fetchがTypeErrorで失敗した場合にリトライして成功する", async () => {
    vi.useFakeTimers();
    try {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new TypeError("Load failed"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ code: "RETRY", playerId: "p-retry" }),
        });
      vi.stubGlobal("fetch", mockFetch);

      const promise = wsClient.createRoom({
        playerName: "Alice",
        gameId: "othello",
        sessionToken: "token",
      });

      // 1回目の失敗 → 600ms後にリトライ
      const assertion = expect(promise).resolves.toEqual({ code: "RETRY", playerId: "p-retry" });
      await vi.advanceTimersByTimeAsync(2000);
      await assertion;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("3回連続してTypeErrorで失敗した場合はrejectされる", async () => {
    vi.useFakeTimers();
    try {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError("Load failed"));
      vi.stubGlobal("fetch", mockFetch);

      const promise = wsClient.createRoom({
        playerName: "Alice",
        gameId: "othello",
        sessionToken: "token",
      });

      // 600ms + 1200ms の待機後に3回目が throw → 計1800ms
      const assertion = expect(promise).rejects.toBeInstanceOf(TypeError);
      await vi.advanceTimersByTimeAsync(3000);
      await assertion;

      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("HTTPエラー（ok: false）の場合はリトライせずに即座に失敗する", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "不明なゲームID: xxx" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      wsClient.createRoom({ playerName: "Alice", gameId: "xxx", sessionToken: "token" })
    ).rejects.toThrow("不明なゲームID: xxx");

    // リトライなし（1回だけ呼ばれる）
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
