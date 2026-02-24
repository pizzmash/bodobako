import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

// -------------------------------------------------------------------------
// RoomDO - WebSocket メッセージハンドラテスト
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// ヘルパー: メッセージキュー
// -------------------------------------------------------------------------

/** WebSocket のメッセージを順番に受け取れるキュー */
function createMsgQueue(ws: WebSocket) {
  const msgs: unknown[] = [];
  const resolvers: ((msg: unknown) => void)[] = [];

  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data as string);
    if (resolvers.length > 0) {
      resolvers.shift()!(msg);
    } else {
      msgs.push(msg);
    }
  });

  return {
    /** 次のメッセージを受け取る */
    next(): Promise<unknown> {
      if (msgs.length > 0) return Promise.resolve(msgs.shift()!);
      return new Promise((resolve) => resolvers.push(resolve));
    },
    /** 指定した type のメッセージが来るまで待つ（他のメッセージはスキップ） */
    async nextOfType(type: string): Promise<unknown> {
      for (let i = 0; i < 10; i++) {
        const msg = await this.next() as { type: string };
        if (msg.type === type) return msg;
      }
      throw new Error(`Expected message type "${type}" but not received within 10 messages`);
    },
  };
}

// -------------------------------------------------------------------------
// ヘルパー: ルーム作成・WS接続
// -------------------------------------------------------------------------

/** ルームを作成して code と sessionToken を返す */
async function createRoom(
  playerName = "Alice",
  gameId = "othello"
): Promise<{ code: string; sessionToken: string; playerId: string }> {
  const sessionToken = crypto.randomUUID();
  const res = await SELF.fetch("http://example.com/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName, gameId, sessionToken }),
  });
  if (!res.ok) {
    const err = await res.json<{ error: string }>();
    throw new Error(`createRoom failed: ${err.error}`);
  }
  const { code, playerId } = await res.json<{ code: string; playerId: string }>();
  return { code, sessionToken, playerId };
}

/** WebSocket に接続してメッセージキューを返す */
async function connectWs(code: string, sessionToken: string) {
  const res = await SELF.fetch(
    `http://example.com/rooms/${code}/ws?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: { Upgrade: "websocket", Connection: "upgrade" } }
  );
  if (res.status !== 101) throw new Error(`WebSocket upgrade failed: ${res.status}`);

  const ws = res.webSocket!;
  ws.accept();
  const queue = createMsgQueue(ws);
  return { ws, queue };
}

/** WS メッセージを送信して次のメッセージを受け取る */
async function sendMsg(ws: WebSocket, queue: ReturnType<typeof createMsgQueue>, msg: unknown) {
  const next = queue.next();
  ws.send(JSON.stringify(msg));
  return next;
}

// -------------------------------------------------------------------------
// テスト
// -------------------------------------------------------------------------

describe("room:join", () => {
  it("正常: 2人目がルームに参加できる", async () => {
    const { code } = await createRoom();
    const bobToken = crypto.randomUUID();
    const { ws, queue } = await connectWs(code, bobToken);

    const ack = await sendMsg(ws, queue, {
      type: "room:join",
      reqId: "join-001",
      roomCode: code,
      playerName: "Bob",
      sessionToken: bobToken,
    }) as { type: string; reqId: string; ok: boolean; data?: { room: { players: unknown[] }; playerId: string } };

    expect(ack.type).toBe("ack");
    expect(ack.ok).toBe(true);
    expect(ack.data!.room.players).toHaveLength(2);
    expect(typeof ack.data!.playerId).toBe("string");

    ws.close();
  });

  it("異常: playerName が空文字 → ack(error)", async () => {
    const { code } = await createRoom();
    const bobToken = crypto.randomUUID();
    const { ws, queue } = await connectWs(code, bobToken);

    const ack = await sendMsg(ws, queue, {
      type: "room:join",
      reqId: "join-err",
      roomCode: code,
      playerName: "",
      sessionToken: bobToken,
    }) as { type: string; ok: boolean };

    expect(ack.ok).toBe(false);
    ws.close();
  });

  it("異常: ルームが満員（2人埋まり）→ ack(error)", async () => {
    const { code } = await createRoom();

    // Bob 参加
    const bobToken = crypto.randomUUID();
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });

    // Charlie（3人目）が参加しようとする
    const charlieToken = crypto.randomUUID();
    const { ws: charlieWs, queue: charlieQueue } = await connectWs(code, charlieToken);
    const ack = await sendMsg(charlieWs, charlieQueue, {
      type: "room:join", reqId: "join-charlie", roomCode: code,
      playerName: "Charlie", sessionToken: charlieToken,
    }) as { type: string; ok: boolean; error?: string };

    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/満員/);

    bobWs.close();
    charlieWs.close();
  });
});

describe("session:reconnect", () => {
  it("正常: 有効な sessionToken で再接続できる", async () => {
    // Alice のセッションを使って別の WS から reconnect を試みる
    const { code, sessionToken: aliceToken } = await createRoom();
    const { ws, queue } = await connectWs(code, crypto.randomUUID());

    const ack = await sendMsg(ws, queue, {
      type: "session:reconnect",
      reqId: "reconnect-001",
      sessionToken: aliceToken,
    }) as { type: string; ok: boolean; data?: { room: unknown; playerId: string } };

    expect(ack.type).toBe("ack");
    expect(ack.ok).toBe(true);
    expect(ack.data!.room).toBeTruthy();
    expect(ack.data!.playerId).toBeTruthy();

    ws.close();
  });

  it("異常: 不明な sessionToken → ack(error)", async () => {
    const { code } = await createRoom();
    const { ws, queue } = await connectWs(code, crypto.randomUUID());

    const ack = await sendMsg(ws, queue, {
      type: "session:reconnect",
      reqId: "reconnect-err",
      sessionToken: crypto.randomUUID(),
    }) as { type: string; ok: boolean };

    expect(ack.ok).toBe(false);
    ws.close();
  });
});

describe("game:start", () => {
  /** Alice と Bob が揃ったルームを用意する */
  async function setup2PlayerRoom() {
    const { code, sessionToken: aliceToken } = await createRoom();
    const bobToken = crypto.randomUUID();

    // Alice が既存セッションで接続（reconnect ack が来る）
    const { ws: aliceWs, queue: aliceQueue } = await connectWs(code, aliceToken);

    // Bob が参加
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });

    return { aliceWs, aliceQueue, bobWs, bobQueue };
  }

  it("正常: ホストが2人揃った状態でゲームを開始できる", async () => {
    const { aliceWs, aliceQueue, bobWs } = await setup2PlayerRoom();

    // Alice がゲームを開始（game:started を受け取るまで待つ）
    aliceWs.send(JSON.stringify({ type: "game:start" }));
    const msg = await aliceQueue.nextOfType("game:started") as { type: string; state: unknown };

    expect(msg.type).toBe("game:started");
    expect(msg.state).toBeTruthy();

    aliceWs.close();
    bobWs.close();
  });

  it("異常: ホスト以外がゲームを開始しようとする → error", async () => {
    const { aliceWs, bobWs, bobQueue } = await setup2PlayerRoom();

    // Bob がゲームを開始しようとする
    bobWs.send(JSON.stringify({ type: "game:start" }));
    const errorMsg = await bobQueue.nextOfType("error") as { type: string; message?: string };

    expect(errorMsg.type).toBe("error");
    expect(errorMsg.message).toMatch(/ホスト/);

    aliceWs.close();
    bobWs.close();
  });

  it("異常: 1人のみのルームでゲームを開始しようとする → error", async () => {
    const { code, sessionToken: aliceToken } = await createRoom();

    // 新しい匿名セッションで接続し、aliceToken で session:reconnect
    const { ws, queue } = await connectWs(code, aliceToken);
    // reconnect ack を受け取ってから game:start を送る
    const reconnectAck = await queue.nextOfType("ack");
    expect((reconnectAck as { type: string; ok: boolean }).ok).toBe(true);

    ws.send(JSON.stringify({ type: "game:start" }));
    const errorMsg = await queue.nextOfType("error") as { type: string; message?: string };

    expect(errorMsg.type).toBe("error");
    expect(errorMsg.message).toMatch(/プレイヤー/);

    ws.close();
  });
});

describe("game:move", () => {
  async function setupPlayingRoom() {
    const { code, sessionToken: aliceToken, playerId: alicePlayerId } = await createRoom();
    const bobToken = crypto.randomUUID();

    const { ws: aliceWs, queue: aliceQueue } = await connectWs(code, aliceToken);
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);

    // Bob 参加
    const joinAck = await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    }) as { data?: { playerId: string } };
    const bobPlayerId = joinAck.data?.playerId ?? "";

    // Alice がゲーム開始
    aliceWs.send(JSON.stringify({ type: "game:start" }));
    const startMsg = await aliceQueue.nextOfType("game:started") as {
      type: string;
      state: { currentPlayerIndex: number; playerIds: string[] };
    };

    return { aliceWs, aliceQueue, bobWs, bobQueue, gameState: startMsg.state, alicePlayerId, bobPlayerId };
  }

  /** playerIds[currentPlayerIndex] から現在の手番プレイヤーの WS を返す */
  function currentPlayerWs(
    gameState: { currentPlayerIndex: number; playerIds: string[] },
    alicePlayerId: string,
    aliceWs: WebSocket, aliceQueue: ReturnType<typeof createMsgQueue>,
    bobWs: WebSocket, bobQueue: ReturnType<typeof createMsgQueue>
  ) {
    const currentId = gameState.playerIds[gameState.currentPlayerIndex];
    return currentId === alicePlayerId
      ? [aliceWs, aliceQueue] as const
      : [bobWs, bobQueue] as const;
  }

  it("正常: 有効な手を送信するとゲーム状態が更新される", async () => {
    const { aliceWs, aliceQueue, bobWs, bobQueue, gameState, alicePlayerId } = await setupPlayingRoom();

    const [currentWs, currentQueue] = currentPlayerWs(
      gameState, alicePlayerId, aliceWs, aliceQueue, bobWs, bobQueue
    );

    currentWs.send(JSON.stringify({ type: "game:move", move: { row: 2, col: 3 } }));
    const msg = await currentQueue.nextOfType("game:stateUpdated") as { type: string };

    expect(msg.type).toBe("game:stateUpdated");

    aliceWs.close();
    bobWs.close();
  });

  it("異常: 無効な手 → error", async () => {
    const { aliceWs, aliceQueue, bobWs, bobQueue, gameState, alicePlayerId } = await setupPlayingRoom();

    const [currentWs, currentQueue] = currentPlayerWs(
      gameState, alicePlayerId, aliceWs, aliceQueue, bobWs, bobQueue
    );

    // 無効な手（初期状態で白石が置かれているマス）
    currentWs.send(JSON.stringify({ type: "game:move", move: { row: 3, col: 3 } }));
    const errorMsg = await currentQueue.nextOfType("error") as { type: string };

    expect(errorMsg.type).toBe("error");

    aliceWs.close();
    bobWs.close();
  });
});


describe("room:leave", () => {
  it("正常: room:leave で room:left が返る", async () => {
    const { code } = await createRoom();

    // Bob 接続・参加
    const bobToken = crypto.randomUUID();
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });

    // Bob が退出
    bobWs.send(JSON.stringify({ type: "room:leave" }));
    const leftMsg = await bobQueue.nextOfType("room:left") as { type: string };

    expect(leftMsg.type).toBe("room:left");

    bobWs.close();
  });
});

describe("broadcast", () => {
  it("room:join 後に既存クライアント全員に room:updated が配信される", async () => {
    const { code, sessionToken: aliceToken } = await createRoom();

    // Alice が WS 接続（既存セッション → ack + room:updated(1人) が届く）
    const { ws: aliceWs, queue: aliceQueue } = await connectWs(code, aliceToken);
    await aliceQueue.nextOfType("ack");          // reconnect ack を消費
    await aliceQueue.nextOfType("room:updated"); // reconnect 後の broadcast(1人)も消費

    // Bob が接続・参加
    const bobToken = crypto.randomUUID();
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });

    // Alice は Bob 参加の room:updated を受け取る（2人分）
    const aliceMsg = await aliceQueue.nextOfType("room:updated") as {
      type: string;
      room: { players: unknown[] };
    };
    expect(aliceMsg.type).toBe("room:updated");
    expect(aliceMsg.room.players).toHaveLength(2);

    aliceWs.close();
    bobWs.close();
  });

  it("room:leave 時に退出者は room:left、残存者は room:updated を受け取る", async () => {
    const { code, sessionToken: aliceToken } = await createRoom();

    // Alice 接続（ack + room:updated(1人) を消費）
    const { ws: aliceWs, queue: aliceQueue } = await connectWs(code, aliceToken);
    await aliceQueue.nextOfType("ack");
    await aliceQueue.nextOfType("room:updated"); // reconnect broadcast(1人)

    // Bob 接続・参加
    const bobToken = crypto.randomUUID();
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });
    await aliceQueue.nextOfType("room:updated"); // Bob 参加の room:updated(2人) を消費

    // Bob が退出
    bobWs.send(JSON.stringify({ type: "room:leave" }));

    // Bob は room:left を受け取る
    const bobLeft = await bobQueue.nextOfType("room:left") as { type: string };
    expect(bobLeft.type).toBe("room:left");

    // Alice は room:updated を受け取る（Bob が消えた状態、1人）
    const aliceUpdate = await aliceQueue.nextOfType("room:updated") as {
      type: string;
      room: { players: unknown[] };
    };
    expect(aliceUpdate.type).toBe("room:updated");
    expect(aliceUpdate.room.players).toHaveLength(1);

    aliceWs.close();
    bobWs.close();
  });
});

describe("不正メッセージ", () => {
  it("不明なメッセージタイプ → error", async () => {
    const { code, sessionToken: aliceToken } = await createRoom();
    const { ws, queue } = await connectWs(code, aliceToken);
    await queue.nextOfType("ack"); // reconnect ack を消費

    ws.send(JSON.stringify({ type: "unknown:action", data: "test" }));
    const errorMsg = await queue.nextOfType("error") as { type: string; message: string };

    expect(errorMsg.type).toBe("error");
    expect(errorMsg.message).toMatch(/不正/);

    ws.close();
  });
});

describe("game:move（ターン外）", () => {
  it("手番でないプレイヤーが手を打つ → error", async () => {
    const { code, sessionToken: aliceToken, playerId: alicePlayerId } = await createRoom();
    const bobToken = crypto.randomUUID();

    const { ws: aliceWs, queue: aliceQueue } = await connectWs(code, aliceToken);
    const { ws: bobWs, queue: bobQueue } = await connectWs(code, bobToken);

    // Bob 参加
    await sendMsg(bobWs, bobQueue, {
      type: "room:join", reqId: "join-bob", roomCode: code,
      playerName: "Bob", sessionToken: bobToken,
    });

    // Alice がゲーム開始
    aliceWs.send(JSON.stringify({ type: "game:start" }));
    const startMsg = await aliceQueue.nextOfType("game:started") as {
      state: { currentPlayerIndex: number; playerIds: string[] };
    };
    const gameState = startMsg.state;

    // 手番でないプレイヤーの WS を特定
    const currentId = gameState.playerIds[gameState.currentPlayerIndex];
    const [nonCurrentWs, nonCurrentQueue] = currentId === alicePlayerId
      ? [bobWs, bobQueue] as const
      : [aliceWs, aliceQueue] as const;

    // 手番でないプレイヤーが有効な位置に手を打つ（ターン違反）
    nonCurrentWs.send(JSON.stringify({ type: "game:move", move: { row: 2, col: 3 } }));
    const errorMsg = await nonCurrentQueue.nextOfType("error") as { type: string };

    expect(errorMsg.type).toBe("error");

    aliceWs.close();
    bobWs.close();
  });
});
