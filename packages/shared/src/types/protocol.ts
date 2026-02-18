import type { RoomInfo } from "./room.js";

export interface GameResult {
  ranking: string[] | null;
  reason: string;
}

// --- ネイティブWebSocket用プロトコル型（Workers/DO向け） ---

export type WsClientMessage =
  | { type: "room:create"; reqId: string; playerName: string; gameId: string; sessionToken: string }
  | { type: "room:join"; reqId: string; roomCode: string; playerName: string; sessionToken: string }
  | { type: "session:reconnect"; reqId: string; sessionToken: string }
  | { type: "room:leave" }
  | { type: "game:start" }
  | { type: "game:move"; move: unknown }

export type WsAckSuccess<T = unknown> = { type: "ack"; reqId: string; ok: true; data: T };
export type WsAckError = { type: "ack"; reqId: string; ok: false; error: string };

export type WsServerMessage =
  | WsAckSuccess
  | WsAckError
  | { type: "room:updated"; room: RoomInfo }
  | { type: "game:started"; state: unknown }
  | { type: "game:stateUpdated"; state: unknown }
  | { type: "game:ended"; result: GameResult }
  | { type: "room:left" }
  | { type: "error"; message: string }
