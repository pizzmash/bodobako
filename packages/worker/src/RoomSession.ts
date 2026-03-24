import type {
    GameResult,
    Player,
    RoomInfo,
    WsClientMessage,
    WsServerMessage,
} from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";
import { verifyFirebaseToken } from "./lib/verifyFirebaseToken.js";

const DISCONNECT_GRACE_MS = 30_000;

// --- メッセージバリデーション ---

function parseClientMessage(raw: unknown): WsClientMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const msg = raw as Record<string, unknown>;

  switch (msg.type) {
    case "room:create":
      if (typeof msg.reqId !== "string" || typeof msg.playerName !== "string" ||
          typeof msg.gameId !== "string" || typeof msg.sessionToken !== "string") return null;
      return msg as Extract<WsClientMessage, { type: "room:create" }>;

    case "room:join":
      if (typeof msg.reqId !== "string" || typeof msg.roomCode !== "string" ||
          typeof msg.playerName !== "string" || typeof msg.sessionToken !== "string") return null;
      if (msg.idToken !== undefined && typeof msg.idToken !== "string") return null;
      return msg as Extract<WsClientMessage, { type: "room:join" }>;

    case "session:reconnect":
      if (typeof msg.reqId !== "string" || typeof msg.sessionToken !== "string") return null;
      return msg as Extract<WsClientMessage, { type: "session:reconnect" }>;

    case "room:leave":
      return { type: "room:leave" };

    case "game:start":
      return { type: "game:start" };

    case "game:rematch-request":
      return { type: "game:rematch-request" };

    case "game:move":
      if (!("move" in msg)) return null;
      return { type: "game:move", move: msg.move };

    default:
      return null;
  }
}

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
  /** 再戦希望を送ったplayerId一覧 */
  rematchRequests: string[];
}

interface RoomSessionEnv {
  FIREBASE_PROJECT_ID?: string;
}

export class RoomSession implements DurableObject {
  private state: DurableObjectState;
  private env: RoomSessionEnv;
  private room: RoomState | null = null;
  /** WebSocket -> playerId のマッピング（インメモリのみ、hibarnation復帰時に再構築） */
  private wsToPlayer = new Map<WebSocket, string>();

  constructor(state: DurableObjectState, env: RoomSessionEnv) {
    this.state = state;
    this.env = env;
  }

  // ---------------------------------------------------------------------------
  // Durable Object lifecycle
  // ---------------------------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/exists" && request.method === "GET") {
      const room = await this.state.storage.get("room");
      return new Response(null, { status: room ? 200 : 404 });
    }
    if (url.pathname === "/ws") {
      return this.handleWebSocket(request, url);
    }
    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/info" && request.method === "GET") {
      return this.handleInfo();
    }
    if (url.pathname === "/invite-meta" && request.method === "GET") {
      return this.handleInviteMeta(url);
    }

    return new Response("Not found", { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.loadRoom();
    if (!this.room) return;

    const now = Date.now();
    let changed = false;
    let rematchChanged = false;

    for (const [playerId, scheduledAt] of Object.entries(this.room.pendingRemovals)) {
      if (now >= scheduledAt) {
        const leavingPlayer = this.room.players.find((p) => p.id === playerId);
        const wasPlaying = this.room.status === "playing";

        this.room.players = this.room.players.filter((p) => p.id !== playerId);
        // セッションも削除
        for (const [token, pid] of Object.entries(this.room.sessions)) {
          if (pid === playerId) delete this.room.sessions[token];
        }
        delete this.room.pendingRemovals[playerId];
        if (!wasPlaying && this.room.rematchRequests.includes(playerId)) {
          this.room.rematchRequests = this.room.rematchRequests.filter((id) => id !== playerId);
          rematchChanged = true;
        }
        changed = true;

        if (wasPlaying && leavingPlayer && this.room.players.length > 0) {
          const remaining = this.room.players.map((p) => p.id);
          const result: GameResult = {
            ranking: [...remaining, playerId],
            reason: "退出",
            forfeitedBy: { id: playerId, name: leavingPlayer.name },
          };
          this.room.status = "finished";
          this.room.gameResult = result;
          this.broadcast({ type: "game:ended", result });
        }
      }
    }

    if (changed) {
      if (this.room.players.length === 0) {
        await this.state.storage.deleteAll();
        this.room = null;
      } else {
        await this.saveRoom();
        this.broadcast({ type: "room:updated", room: this.toRoomInfo() });
        if (rematchChanged) {
          this.broadcast({ type: "game:rematch-updated", playerIds: this.room.rematchRequests });
        }
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const { code, gameId, playerName, sessionToken, userId } = b;

    if (typeof code !== "string" || !code) {
      return Response.json({ error: "code は必須です" }, { status: 400 });
    }
    if (typeof gameId !== "string" || !gameId.trim()) {
      return Response.json({ error: "gameId は必須です" }, { status: 400 });
    }
    if (typeof playerName !== "string" || !playerName.trim() || playerName.trim().length > 20) {
      return Response.json({ error: "playerName は1〜20文字で入力してください" }, { status: 400 });
    }
    if (typeof sessionToken !== "string" || !sessionToken) {
      return Response.json({ error: "sessionToken は必須です" }, { status: 400 });
    }
    if (!getGameDefinition(gameId)) {
      return Response.json({ error: `不明なゲームID: ${gameId}` }, { status: 400 });
    }

    const trimmedPlayerName = playerName.trim();

    await this.loadRoom();
    if (this.room) {
      return Response.json({ error: "ルームはすでに存在します" }, { status: 409 });
    }

    const playerId = crypto.randomUUID();
    const player: Player = { id: playerId, name: trimmedPlayerName };
    if (typeof userId === "string" && userId) player.userId = userId;

    this.room = {
      code,
      gameId,
      players: [player],
      hostId: playerId,
      status: "waiting",
      gameState: null,
      gameResult: null,
      sessions: { [sessionToken]: playerId },
      pendingRemovals: {},
      rematchRequests: [],
    };
    await this.saveRoom();
    return Response.json({ playerId });
  }

  private async handleInfo(): Promise<Response> {
    await this.loadRoom();
    if (!this.room) return Response.json({ error: "ルームなし" }, { status: 404 });
    return Response.json(this.toAdminInfo());
  }

  private async handleInviteMeta(url: URL): Promise<Response> {
    await this.loadRoom();
    if (!this.room) return Response.json({ error: "ルームなし" }, { status: 404 });

    const uid = (url.searchParams.get("uid") ?? "").trim();
    if (!uid) return Response.json({ error: "uid は必須です" }, { status: 400 });

    const inviter = this.room.players.find((player) => player.userId === uid);
    if (!inviter) {
      return Response.json({ error: "このルームの参加者ではありません" }, { status: 403 });
    }

    return Response.json({
      code: this.room.code,
      gameId: this.room.gameId,
      status: this.room.status,
      inviterName: inviter.name,
      isHost: inviter.id === this.room.hostId,
    });
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

    // JSON パース + 構造バリデーション
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "不正なメッセージ形式です" } satisfies WsServerMessage));
      return;
    }

    const msg = parseClientMessage(parsed);
    if (!msg) {
      ws.send(JSON.stringify({ type: "error", message: "不正なメッセージ形式です" } satisfies WsServerMessage));
      return;
    }

    // 未認証接続: room:join と session:reconnect のみ許可
    if (!playerId) {
      if (msg.type === "room:join") {
        await this.handleJoin(ws, msg, sessionToken);
      } else if (msg.type === "session:reconnect") {
        await this.handleReconnect(ws, msg);
      } else if ("reqId" in msg && typeof msg.reqId === "string") {
        this.sendAck(ws, msg.reqId, { error: "先にルームに参加してください" }, false);
      } else {
        ws.send(JSON.stringify({ type: "error", message: "先にルームに参加してください" } satisfies WsServerMessage));
      }
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

      case "game:rematch-request":
        if (playerId) await this.handleRematchRequest(playerId);
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
    const trimmedName = msg.playerName.trim();
    if (!trimmedName || trimmedName.length > 20) {
      this.sendAck(ws, msg.reqId, { error: "プレイヤー名は1〜20文字で入力してください" }, false);
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

    // idToken が提供された場合は Firebase で検証して userId を取得
    let userId: string | undefined;
    if (msg.idToken && this.env.FIREBASE_PROJECT_ID) {
      const verified = await verifyFirebaseToken(msg.idToken, this.env.FIREBASE_PROJECT_ID);
      if (verified) userId = verified.uid;
    }

    const playerId = crypto.randomUUID();
    const player: Player = { id: playerId, name: trimmedName };
    if (userId) player.userId = userId;
    this.room.players.push(player);
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

    const leavingPlayer = this.room.players.find((p) => p.id === playerId);
    const wasPlaying = this.room.status === "playing";
    const wasFinished = this.room.status === "finished";

    this.room.players = this.room.players.filter((p) => p.id !== playerId);
    delete this.room.sessions[sessionToken];
    delete this.room.pendingRemovals[playerId];
    this.wsToPlayer.delete(ws);

    const rematchLengthBefore = this.room.rematchRequests.length;
    this.room.rematchRequests = this.room.rematchRequests.filter((id) => id !== playerId);
    const rematchChanged = wasFinished && this.room.rematchRequests.length !== rematchLengthBefore;

    ws.send(JSON.stringify({ type: "room:left" } satisfies WsServerMessage));

    if (this.room.players.length === 0) {
      await this.state.storage.deleteAll();
      this.room = null;
    } else if (wasPlaying && leavingPlayer) {
      const remaining = this.room.players.map((p) => p.id);
      const result: GameResult = {
        ranking: [...remaining, playerId],
        reason: "退出",
        forfeitedBy: { id: playerId, name: leavingPlayer.name },
      };
      this.room.status = "finished";
      this.room.gameResult = result;
      await this.saveRoom();
      this.broadcastExcept(ws, { type: "game:ended", result });
      this.broadcastExcept(ws, { type: "room:updated", room: this.toRoomInfo() });
    } else {
      await this.saveRoom();
      this.broadcastExcept(ws, { type: "room:updated", room: this.toRoomInfo() });
      if (rematchChanged) {
        this.broadcastExcept(ws, { type: "game:rematch-updated", playerIds: this.room.rematchRequests });
      }
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
      const requestingIds = this.room.rematchRequests.length > 0
        ? this.room.rematchRequests
        : this.room.players.map((p) => p.id);

      // 希望しなかったプレイヤーを除外して room:left を送信
      const removedPlayers = this.room.players.filter((p) => !requestingIds.includes(p.id));
      for (const removed of removedPlayers) {
        for (const removedWs of this.state.getWebSockets()) {
          const token = this.state.getTags(removedWs)[0] ?? "";
          if (this.room.sessions[token] === removed.id) {
            removedWs.send(JSON.stringify({ type: "room:left" } satisfies WsServerMessage));
          }
        }
        this.room.players = this.room.players.filter((p) => p.id !== removed.id);
        for (const [token, pid] of Object.entries(this.room.sessions)) {
          if (pid === removed.id) delete this.room.sessions[token];
        }
      }

      this.room.status = "waiting";
      this.room.gameState = null;
      this.room.gameResult = null;
      this.room.rematchRequests = [];
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

  private async handleRematchRequest(playerId: string): Promise<void> {
    if (!this.room || this.room.status !== "finished") return;
    if (!this.room.rematchRequests.includes(playerId)) {
      this.room.rematchRequests.push(playerId);
      await this.saveRoom();
      this.broadcast({ type: "game:rematch-updated", playerIds: this.room.rematchRequests });
    }
  }

  private async handleGameMove(ws: WebSocket, playerId: string, move: unknown): Promise<void> {
    if (!this.room || this.room.status !== "playing" || !this.room.gameState) {
      ws.send(JSON.stringify({ type: "error", message: "ゲームが進行中ではありません" } satisfies WsServerMessage));
      return;
    }

    const def = getGameDefinition(this.room.gameId);
    if (!def) return;

    // parseMove が定義されていればパース＆型チェックを行う
    const parsedMove = def.parseMove ? def.parseMove(move) : move;
    if (parsedMove === null) {
      ws.send(JSON.stringify({ type: "error", message: "無効な手です" } satisfies WsServerMessage));
      return;
    }

    if (!def.validateMove(this.room.gameState, parsedMove, playerId)) {
      ws.send(JSON.stringify({ type: "error", message: "無効な手です" } satisfies WsServerMessage));
      return;
    }

    const newState = def.applyMove(this.room.gameState, parsedMove, playerId);
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
