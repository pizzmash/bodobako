import type { Player, RoomInfo } from "@claude-demo/shared";

interface Room {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  gameState: unknown | null;
  socketToPlayer: Map<string, string>;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId: string, playerName: string, gameId: string): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const player: Player = { id: playerId, name: playerName };
  const room: Room = {
    code,
    gameId,
    players: [player],
    hostId: playerId,
    status: "waiting",
    gameState: null,
    socketToPlayer: new Map([[socketId, playerId]]),
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  socketId: string,
  playerName: string
): { room: Room; playerId: string } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "ルームが見つかりません" };
  if (room.status !== "waiting") return { error: "ゲームはすでに開始されています" };
  if (room.players.length >= 2) return { error: "ルームが満員です" };

  const playerId = crypto.randomUUID();
  const player: Player = { id: playerId, name: playerName };
  room.players.push(player);
  room.socketToPlayer.set(socketId, playerId);
  return { room, playerId };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.socketToPlayer.has(socketId)) return room;
  }
  return undefined;
}

export function getPlayerIdBySocket(room: Room, socketId: string): string | undefined {
  return room.socketToPlayer.get(socketId);
}

export function removePlayer(socketId: string): Room | undefined {
  const room = getRoomBySocket(socketId);
  if (!room) return undefined;

  const playerId = room.socketToPlayer.get(socketId);
  room.socketToPlayer.delete(socketId);
  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    return undefined;
  }

  return room;
}

export function resetRoom(room: Room): void {
  room.status = "waiting";
  room.gameState = null;
}

export function toRoomInfo(room: Room): RoomInfo {
  return {
    code: room.code,
    gameId: room.gameId,
    players: room.players,
    hostId: room.hostId,
    status: room.status,
    gameState: room.gameState,
  };
}
