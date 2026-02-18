import type {
  GameResult,
  Player,
  RoomInfo,
  WsClientMessage,
  WsServerMessage,
} from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";

const DISCONNECT_GRACE_MS = 30_000;

interface RoomState {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  gameState: unknown | null;
  gameResult: GameResult | null;
  /** sessionToken -> playerId */
  sessions: Record<string, string>;
  /** playerId -> 切断時刻 (msエポック) — alarm用 */
  pendingRemovals: Record<string, number>;
}

export class RoomDO implements DurableObject {
  private state: DurableObjectState;
  private room: RoomState | null = null;
  /** WebSocket -> playerId のマッピング（インメモリのみ、hibarnation復帰時に再構築） */
  private wsToPlayer = new Map<WebSocket, string>();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // ---------------------------------------------------------------------------
  // Durable Object lifecycle
  // ---------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return this.handleWebSocket(request, url);
    }
    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/info" && request.method === "GET") {
      return this.handleInfo();
    }

    return new Response("Not found", { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.loadRoom();
    if (!this.room) return;

    const now = Date.now();
    let changed = false;

    for (const [playerId, scheduledAt] of Object.entries(this.room.pendingRemovals)) {
      if (now >= scheduledAt) {
        this.room.players = this.room.players.filter((p) => p.id !== playerId);
        // セッションも削除
        for (const [token, pid] of Object.entries(this.room.sessions)) {
          if (pid === playerId) delete this.room.sessions[token];
        }
        delete this.room.pendingRemovals[playerId];
        changed = true;
      }
    }

    if (changed) {
      if (this.room.players.length === 0) {
        await this.state.storage.deleteAll();
        this.room = null;
      } else {
        await this.saveRoom();
        this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
      }
    }

    // 残りのタイマーがあれば再スケジュール
    const remaining = Object.values(this.room?.pendingRemovals ?? {});
    if (remaining.length > 0) {
      await this.state.storage.setAlarm(Math.min(...remaining));
    }
  }

  // ---------------------------------------------------------------------------
  // HTTP handlers
  // ---------------------------------------------------------------------------

  private async handleInit(request: Request): Promise<Response> {
    const { code, gameId, playerName, sessionToken } = (await request.json()) as {
      code: string;
      gameId: string;
      playerName: string;
      sessionToken: string;
    };

    await this.loadRoom();
    if (this.room) {
      return Response.json({ error: "ルームはすでに存在します" }, { status: 409 });
    }

    const playerId = crypto.randomUUID();
    this.room = {
      code,
      gameId,
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      gameState: null,
      gameResult: null,
      sessions: { [sessionToken]: playerId },
      pendingRemovals: {},
    };
    await this.saveRoom();
    return Response.json({ playerId });
  }

  private async handleInfo(): Promise<Response> {
    await this.loadRoom();
    if (!this.room) return Response.json({ error: "ルームなし" }, { status: 404 });
    return Response.json(this.toAdminInfo());
  }

  // ---------------------------------------------------------------------------
  // WebSocket handling (Hibernation API)
  // ---------------------------------------------------------------------------

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    await this.loadRoom();
    if (!this.room) {
      return new Response("ルームが見つかりません", { status: 404 });
    }

    const sessionToken = url.searchParams.get("sessionToken") ?? "";
    const { 0: client, 1: server } = new WebSocketPair();

    // Hibernation API: タグでセッションを紐付け
    this.state.acceptWebSocket(server, [sessionToken]);

    // 既存セッションなら再接続
    const existingPlayerId = this.room.sessions[sessionToken];
    if (existingPlayerId) {
      const playerExists = this.room.players.some((p) => p.id === existingPlayerId);
      if (playerExists) {
        // 切断タイマーをキャンセル
        delete this.room.pendingRemovals[existingPlayerId];
        await this.saveRoom();
        this.wsToPlayer.set(server, existingPlayerId);

        // 再接続情報を送信（接続確立後に送る必要があるため少し後に送る）
        queueMicrotask(() => {
          const msg: WsServerMessage = {
            type: "ack",
            reqId: "reconnect",
            ok: true,
            data: {
              room: this.toRoomInfo(),
              playerId: existingPlayerId,
              gameState: this.room?.gameState
                ? this.getPlayerView(existingPlayerId)
                : null,
              gameResult: this.room?.gameResult ?? null,
            },
          };
          server.send(JSON.stringify(msg));
          this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
        });
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // Hibernation API: メッセージ受信
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.loadRoom();
    if (!this.room) return;

    const tags = this.state.getTags(ws);
    const sessionToken = tags[0] ?? "";
    const playerId = this.room.sessions[sessionToken];
    if (!playerId && !this.wsToPlayer.has(ws)) {
      // 未認証の接続 - room:createかroom:joinのみ許可
    }

    let msg: WsClientMessage;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)) as WsClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "不正なメッセージ形式です" } satisfies WsServerMessage));
      return;
    }

    await this.handleMessage(ws, msg, playerId, sessionToken);
  }

  // Hibernation API: 切断
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    await this.loadRoom();
    if (!this.room) return;

    const tags = this.state.getTags(ws);
    const sessionToken = tags[0] ?? "";
    const playerId = this.room.sessions[sessionToken];
    this.wsToPlayer.delete(ws);

    if (!playerId) return;

    // 切断タイマーをセット（30秒後にalarm発火）
    const fireAt = Date.now() + DISCONNECT_GRACE_MS;
    this.room.pendingRemovals[playerId] = fireAt;
    await this.saveRoom();
    await this.state.storage.setAlarm(fireAt);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    await this.webSocketClose(ws, 1011, "Error", false);
  }

  // ---------------------------------------------------------------------------
  // Message dispatch
  // ---------------------------------------------------------------------------

  private async handleMessage(
    ws: WebSocket,
    msg: WsClientMessage,
    playerId: string | undefined,
    sessionToken: string
  ): Promise<void> {
    switch (msg.type) {
      case "room:create":
        this.sendAck(ws, msg.reqId, { error: "このエンドポイントではルーム作成できません" }, false);
        break;

      case "room:join":
        await this.handleJoin(ws, msg, sessionToken);
        break;

      case "session:reconnect":
        await this.handleReconnect(ws, msg);
        break;

      case "room:leave":
        if (playerId) await this.handleLeave(ws, playerId, sessionToken);
        break;

      case "game:start":
        if (playerId) await this.handleGameStart(ws, playerId);
        break;

      case "game:move":
        if (playerId) await this.handleGameMove(ws, playerId, msg.move);
        break;
    }
  }

  private async handleJoin(
    ws: WebSocket,
    msg: Extract<WsClientMessage, { type: "room:join" }>,
    sessionToken: string
  ): Promise<void> {
    if (!this.room) {
      this.sendAck(ws, msg.reqId, { error: "ルームが見つかりません" }, false);
      return;
    }
    if (this.room.status !== "waiting") {
      this.sendAck(ws, msg.reqId, { error: "ゲームはすでに開始されています" }, false);
      return;
    }
    const maxPlayers = getGameDefinition(this.room.gameId)?.maxPlayers ?? 2;
    if (this.room.players.length >= maxPlayers) {
      this.sendAck(ws, msg.reqId, { error: "ルームが満員です" }, false);
      return;
    }

    const playerId = crypto.randomUUID();
    this.room.players.push({ id: playerId, name: msg.playerName });
    this.room.sessions[sessionToken] = playerId;
    this.wsToPlayer.set(ws, playerId);
    await this.saveRoom();

    this.sendAck(ws, msg.reqId, { room: this.toRoomInfo(), playerId }, true);
    this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
  }

  private async handleReconnect(
    ws: WebSocket,
    msg: Extract<WsClientMessage, { type: "session:reconnect" }>
  ): Promise<void> {
    if (!this.room) {
      this.sendAck(ws, msg.reqId, { error: "ルームなし" }, false);
      return;
    }

    const playerId = this.room.sessions[msg.sessionToken];
    if (!playerId || !this.room.players.some((p) => p.id === playerId)) {
      this.sendAck(ws, msg.reqId, { error: "セッションが見つかりません" }, false);
      return;
    }

    // 切断タイマーをキャンセル
    delete this.room.pendingRemovals[playerId];
    await this.saveRoom();
    this.wsToPlayer.set(ws, playerId);

    this.sendAck(ws, msg.reqId, {
      room: this.toRoomInfo(),
      playerId,
      gameState: this.room.gameState ? this.getPlayerView(playerId) : null,
      gameResult: this.room.gameResult ?? null,
    }, true);
    this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
  }

  private async handleLeave(ws: WebSocket, playerId: string, sessionToken: string): Promise<void> {
    if (!this.room) return;

    this.room.players = this.room.players.filter((p) => p.id !== playerId);
    delete this.room.sessions[sessionToken];
    delete this.room.pendingRemovals[playerId];
    this.wsToPlayer.delete(ws);

    ws.send(JSON.stringify({ type: "room:left" } satisfies WsServerMessage));

    if (this.room.players.length === 0) {
      await this.state.storage.deleteAll();
      this.room = null;
    } else {
      await this.saveRoom();
      // 退室したWSを除いた残りのプレイヤーにのみ送信
      this.broadcastExcept(ws, { type: "room:updated", room: this.toRoomInfo() });
    }
  }

  private async handleGameStart(ws: WebSocket, playerId: string): Promise<void> {
    if (!this.room) return;

    if (playerId !== this.room.hostId) {
      ws.send(JSON.stringify({ type: "error", message: "ホストのみ開始できます" } satisfies WsServerMessage));
      return;
    }
    if (this.room.players.length < 2) {
      ws.send(JSON.stringify({ type: "error", message: "プレイヤーが足りません" } satisfies WsServerMessage));
      return;
    }

    if (this.room.status === "finished") {
      this.room.status = "waiting";
      this.room.gameState = null;
      this.room.gameResult = null;
    }

    try {
      const def = getGameDefinition(this.room.gameId);
      if (!def) throw new Error(`Unknown game: ${this.room.gameId}`);

      const playerIds = this.room.players.map((p) => p.id);
      for (let i = playerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
      }

      const state = def.createInitialState(playerIds, this.room.hostId);
      this.room.status = "playing";
      this.room.gameState = state;
      await this.saveRoom();

      this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
      this.broadcastGameState("game:started");
    } catch (e: unknown) {
      ws.send(JSON.stringify({ type: "error", message: (e as Error).message } satisfies WsServerMessage));
    }
  }

  private async handleGameMove(ws: WebSocket, playerId: string, move: unknown): Promise<void> {
    if (!this.room || this.room.status !== "playing" || !this.room.gameState) {
      ws.send(JSON.stringify({ type: "error", message: "ゲームが進行中ではありません" } satisfies WsServerMessage));
      return;
    }

    const def = getGameDefinition(this.room.gameId);
    if (!def) return;

    if (!def.validateMove(this.room.gameState, move, playerId)) {
      ws.send(JSON.stringify({ type: "error", message: "無効な手です" } satisfies WsServerMessage));
      return;
    }

    const newState = def.applyMove(this.room.gameState, move, playerId);
    this.room.gameState = newState;

    const status = def.getStatus(newState);
    if (status === "finished") {
      const ranking = def.getRanking(newState);
      this.room.status = "finished";
      this.room.gameResult = {
        ranking,
        reason: ranking && ranking.length > 0 ? "勝利" : "引き分け",
      };
      await this.saveRoom();

      this.broadcastGameState("game:stateUpdated");
      this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
      this.broadcast({ type: "game:ended", result: this.room.gameResult });
    } else {
      await this.saveRoom();
      this.broadcastGameState("game:stateUpdated");
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private broadcast(msg: WsServerMessage): void {
    this.broadcastExcept(null, msg);
  }

  private broadcastExcept(exclude: WebSocket | null, msg: WsServerMessage): void {
    const json = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue;
      try {
        ws.send(json);
      } catch {
        // 切断済みのWSは無視
      }
    }
  }

  private broadcastGameState(event: "game:started" | "game:stateUpdated"): void {
    if (!this.room?.gameState) return;
    const def = getGameDefinition(this.room.gameId);

    if (!def?.getPlayerView) {
      this.broadcast({ type: event, state: this.room.gameState });
      return;
    }

    // 各プレイヤーに個別のviewを送信
    for (const ws of this.state.getWebSockets()) {
      const tags = this.state.getTags(ws);
      const sessionToken = tags[0] ?? "";
      const pid = this.room.sessions[sessionToken];
      if (!pid) continue;
      try {
        const view = def.getPlayerView(this.room.gameState, pid);
        ws.send(JSON.stringify({ type: event, state: view } satisfies WsServerMessage));
      } catch {
        // 切断済みのWSは無視
      }
    }
  }

  private getPlayerView(playerId: string): unknown {
    if (!this.room?.gameState) return null;
    const def = getGameDefinition(this.room.gameId);
    if (!def?.getPlayerView) return this.room.gameState;
    return def.getPlayerView(this.room.gameState, playerId);
  }

  private sendAck(ws: WebSocket, reqId: string, data: unknown, ok: true): void;
  private sendAck(ws: WebSocket, reqId: string, data: { error: string }, ok: false): void;
  private sendAck(ws: WebSocket, reqId: string, data: unknown, ok: boolean): void {
    let msg: WsServerMessage;
    if (ok) {
      msg = { type: "ack", reqId, ok: true, data };
    } else {
      msg = { type: "ack", reqId, ok: false, error: (data as { error: string }).error };
    }
    ws.send(JSON.stringify(msg));
  }

  private toRoomInfo(): RoomInfo {
    if (!this.room) throw new Error("Room not initialized");
    return {
      code: this.room.code,
      gameId: this.room.gameId,
      players: this.room.players,
      hostId: this.room.hostId,
      status: this.room.status,
      gameState: this.room.gameState,
    };
  }

  private toAdminInfo() {
    if (!this.room) return null;
    const connectedSessions = new Set(
      this.state.getWebSockets().flatMap((ws) => this.state.getTags(ws))
    );
    return {
      code: this.room.code,
      gameId: this.room.gameId,
      status: this.room.status,
      hostId: this.room.hostId,
      playerCount: this.room.players.length,
      players: this.room.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: Object.entries(this.room!.sessions).some(
          ([token, pid]) => pid === p.id && connectedSessions.has(token)
        ),
        isHost: p.id === this.room!.hostId,
        pendingRemoval: p.id in this.room!.pendingRemovals,
      })),
      hasGameState: this.room.gameState != null,
      hasGameResult: this.room.gameResult != null,
    };
  }

  private async loadRoom(): Promise<void> {
    if (this.room) return;
    const saved = await this.state.storage.get<RoomState>("room");
    if (saved) this.room = saved;
  }

  private async saveRoom(): Promise<void> {
    if (!this.room) return;
    await this.state.storage.put("room", this.room);
  }
}
