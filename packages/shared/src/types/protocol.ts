import type { RoomInfo } from "./room.js";

export interface GameResult {
  winnerId: string | null;
  reason: string;
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  room?: RoomInfo;
  playerId?: string;
}

export interface ReconnectResult {
  success: boolean;
  room?: RoomInfo;
  playerId?: string;
  gameState?: unknown;
  gameResult?: GameResult | null;
}

export interface ClientToServerEvents {
  "room:create": (
    playerName: string,
    gameId: string,
    sessionToken: string,
    cb: (roomCode: string) => void
  ) => void;
  "room:join": (
    roomCode: string,
    playerName: string,
    sessionToken: string,
    cb: (result: JoinResult) => void
  ) => void;
  "game:start": () => void;
  "game:move": (move: unknown) => void;
  "room:leave": () => void;
  "session:reconnect": (
    sessionToken: string,
    cb: (result: ReconnectResult) => void
  ) => void;
}

export interface ServerToClientEvents {
  "room:updated": (room: RoomInfo) => void;
  "game:started": (state: unknown) => void;
  "game:stateUpdated": (state: unknown) => void;
  "game:ended": (result: GameResult) => void;
  "room:left": () => void;
  "player:disconnected": (playerId: string) => void;
  error: (message: string) => void;
}
