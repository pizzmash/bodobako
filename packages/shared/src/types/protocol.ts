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

export interface ClientToServerEvents {
  "room:create": (
    playerName: string,
    gameId: string,
    cb: (roomCode: string) => void
  ) => void;
  "room:join": (
    roomCode: string,
    playerName: string,
    cb: (result: JoinResult) => void
  ) => void;
  "game:start": () => void;
  "game:move": (move: unknown) => void;
}

export interface ServerToClientEvents {
  "room:updated": (room: RoomInfo) => void;
  "game:started": (state: unknown) => void;
  "game:stateUpdated": (state: unknown) => void;
  "game:ended": (result: GameResult) => void;
  error: (message: string) => void;
}
