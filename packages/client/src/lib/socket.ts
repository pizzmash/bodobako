import type { WsClientMessage, WsServerMessage } from "@bodobako/shared";

// 環境変数でAPI URLを切替（例: VITE_API_URL=http://localhost:8787）
const API_BASE = import.meta.env.VITE_API_URL ?? "";

// http(s):// → ws(s)://
function toWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, "ws");
}

type EventHandler<T> = (data: T) => void;
type ServerEventMap = {
  [K in WsServerMessage["type"]]: Extract<WsServerMessage, { type: K }>;
};

type PendingRequest = {
  resolve: (data: unknown) => void;
  reject: (error: string) => void;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_JITTER = 0.2;

/**
 * ネイティブWebSocketラッパー。
 * - reqIdベースのリクエスト/レスポンス
 * - 指数バックオフ付き自動再接続
 * - サーバーpushイベントのコールバック登録
 */
class BodobakoWs {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private sessionToken: string | null = null;

  private handlers = new Map<string, Set<EventHandler<WsServerMessage>>>();
  private pending = new Map<string, PendingRequest>();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manualClose = false;

  // -------------------------------------------------------------------------
  // 接続管理
  // -------------------------------------------------------------------------

  connect(roomCode: string, sessionToken: string): void {
    this.roomCode = roomCode;
    this.sessionToken = sessionToken;
    this.manualClose = false;
    this.reconnectAttempt = 0;
    this.openWs();
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      // CLOSINGステート中に届くメッセージを処理しないよう、ハンドラを先にnullにする
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close(1000, "manual close");
      this.ws = null;
    }
    this.roomCode = null;
    this.sessionToken = null;
    this.pending.forEach(({ reject }) => reject("切断されました"));
    this.pending.clear();
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // -------------------------------------------------------------------------
  // メッセージ送受信
  // -------------------------------------------------------------------------

  /** 応答不要メッセージ送信 */
  send(msg: WsClientMessage): void {
    if (!this.connected) return;
    this.ws!.send(JSON.stringify(msg));
  }

  /** reqIdベースのリクエスト/レスポンス */
  request<T = unknown>(msg: Extract<WsClientMessage, { reqId: string }>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject("接続されていません");
        return;
      }
      this.pending.set(msg.reqId, {
        resolve: resolve as (d: unknown) => void,
        reject,
      });
      this.ws!.send(JSON.stringify(msg));
      // タイムアウト (10秒)
      setTimeout(() => {
        if (this.pending.has(msg.reqId)) {
          this.pending.delete(msg.reqId);
          reject("タイムアウトしました");
        }
      }, 10_000);
    });
  }

  // -------------------------------------------------------------------------
  // イベント購読
  // -------------------------------------------------------------------------

  on<K extends WsServerMessage["type"]>(
    type: K,
    handler: EventHandler<ServerEventMap[K]>
  ): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as EventHandler<WsServerMessage>);
  }

  off<K extends WsServerMessage["type"]>(
    type: K,
    handler: EventHandler<ServerEventMap[K]>
  ): void {
    this.handlers.get(type)?.delete(handler as EventHandler<WsServerMessage>);
  }

  once<K extends WsServerMessage["type"]>(
    type: K,
    handler: EventHandler<ServerEventMap[K]>
  ): void {
    const wrapper: EventHandler<ServerEventMap[K]> = (data) => {
      handler(data);
      this.off(type, wrapper);
    };
    this.on(type, wrapper);
  }

  // -------------------------------------------------------------------------
  // HTTP API
  // -------------------------------------------------------------------------

  /** ルーム作成 (HTTP POST) */
  async createRoom(opts: {
    playerName: string;
    gameId: string;
    sessionToken: string;
  }): Promise<{ code: string; playerId: string }> {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "ルーム作成に失敗しました");
    }
    return res.json() as Promise<{ code: string; playerId: string }>;
  }

  // -------------------------------------------------------------------------
  // Private: WebSocket lifecycle
  // -------------------------------------------------------------------------

  private openWs(): void {
    if (!this.roomCode || !this.sessionToken) return;
    const url = `${toWsUrl(API_BASE)}/rooms/${this.roomCode}/ws?sessionToken=${encodeURIComponent(this.sessionToken)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    ws.onmessage = (ev) => {
      let msg: WsServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as WsServerMessage;
      } catch {
        return;
      }
      this.dispatch(msg);
    };

    ws.onclose = (ev) => {
      if (this.manualClose) return;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private dispatch(msg: WsServerMessage): void {
    // ack はペンディングPromiseを解決
    if (msg.type === "ack") {
      const pending = this.pending.get(msg.reqId);
      if (pending) {
        this.pending.delete(msg.reqId);
        if (msg.ok) {
          pending.resolve(msg.data);
        } else {
          pending.reject(msg.error);
        }
      }
      return;
    }

    const set = this.handlers.get(msg.type);
    if (set) {
      for (const handler of set) {
        handler(msg);
      }
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const base = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    const jitter = base * RECONNECT_JITTER * (Math.random() * 2 - 1);
    const delay = base + jitter;
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.openWs();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsClient = new BodobakoWs();
export { API_BASE };
