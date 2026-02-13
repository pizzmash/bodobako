import type { Player, RoomInfo, GameResult } from "@bodobako/shared";
import { getGameDefinition } from "@bodobako/shared";

interface Room {
  code: string;
  gameId: string;
  players: Player[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  gameState: unknown | null;
  gameResult: GameResult | null;
  socketToPlayer: Map<string, string>;
}

const rooms = new Map<string, Room>();

// Session management
const sessionToPlayer = new Map<string, { roomCode: string; playerId: string }>();
const socketToSession = new Map<string, string>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

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

export function createRoom(socketId: string, playerName: string, gameId: string, sessionToken: string): Room {
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
    gameResult: null,
    socketToPlayer: new Map([[socketId, playerId]]),
  };
  rooms.set(code, room);
  createSession(sessionToken, code, playerId, socketId);
  return room;
}

export function joinRoom(
  code: string,
  socketId: string,
  playerName: string,
  sessionToken: string
): { room: Room; playerId: string } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "ルームが見つかりません" };
  if (room.status !== "waiting") return { error: "ゲームはすでに開始されています" };
  const maxPlayers = getGameDefinition(room.gameId)?.maxPlayers ?? 2;
  if (room.players.length >= maxPlayers) return { error: "ルームが満員です" };

  const playerId = crypto.randomUUID();
  const player: Player = { id: playerId, name: playerName };
  room.players.push(player);
  room.socketToPlayer.set(socketId, playerId);
  createSession(sessionToken, code, playerId, socketId);
  return { room, playerId };
}

function createSession(sessionToken: string, roomCode: string, playerId: string, socketId: string): void {
  sessionToPlayer.set(sessionToken, { roomCode, playerId });
  socketToSession.set(socketId, sessionToken);
}

export function removeSession(sessionToken: string): void {
  sessionToPlayer.delete(sessionToken);
  disconnectTimers.delete(sessionToken);
}

export function reconnectPlayer(
  sessionToken: string,
  newSocketId: string
): { room: Room; playerId: string } | null {
  cancelRemoval(sessionToken);

  const session = sessionToPlayer.get(sessionToken);
  if (!session) return null;

  const room = rooms.get(session.roomCode);
  if (!room) {
    sessionToPlayer.delete(sessionToken);
    return null;
  }

  // Check the player still exists in the room
  const playerExists = room.players.some((p) => p.id === session.playerId);
  if (!playerExists) {
    sessionToPlayer.delete(sessionToken);
    return null;
  }

  // Remove old socket mapping and add new one
  for (const [oldSocketId, pid] of room.socketToPlayer) {
    if (pid === session.playerId) {
      room.socketToPlayer.delete(oldSocketId);
      socketToSession.delete(oldSocketId);
      break;
    }
  }
  room.socketToPlayer.set(newSocketId, session.playerId);
  socketToSession.set(newSocketId, sessionToken);

  return { room, playerId: session.playerId };
}

export function scheduleRemoval(
  socketId: string,
  delayMs: number,
  onRemoved: (room: Room) => void
): void {
  const sessionToken = socketToSession.get(socketId);
  if (!sessionToken) {
    // No session — remove immediately (legacy behavior)
    const room = removePlayer(socketId);
    if (room) onRemoved(room);
    return;
  }

  const session = sessionToPlayer.get(sessionToken);
  if (!session) {
    const room = removePlayer(socketId);
    if (room) onRemoved(room);
    return;
  }

  // Remove the socket mapping but keep the player in the room
  socketToSession.delete(socketId);
  const room = rooms.get(session.roomCode);
  if (room) {
    room.socketToPlayer.delete(socketId);
  }

  const timer = setTimeout(() => {
    disconnectTimers.delete(sessionToken);
    // Actually remove the player from the room
    const room = rooms.get(session.roomCode);
    if (room) {
      room.players = room.players.filter((p) => p.id !== session.playerId);
      if (room.players.length === 0) {
        rooms.delete(room.code);
      } else {
        onRemoved(room);
      }
    }
    sessionToPlayer.delete(sessionToken);
  }, delayMs);

  disconnectTimers.set(sessionToken, timer);
}

function cancelRemoval(sessionToken: string): void {
  const timer = disconnectTimers.get(sessionToken);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(sessionToken);
  }
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

  // Clean up session
  const sessionToken = socketToSession.get(socketId);
  if (sessionToken) {
    sessionToPlayer.delete(sessionToken);
    socketToSession.delete(socketId);
    cancelRemoval(sessionToken);
  }

  if (room.players.length === 0) {
    rooms.delete(room.code);
    return undefined;
  }

  return room;
}

export function resetRoom(room: Room): void {
  room.status = "waiting";
  room.gameState = null;
  room.gameResult = null;
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
