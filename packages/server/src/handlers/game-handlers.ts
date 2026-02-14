import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import {
  getRoomBySocket,
  getPlayerIdBySocket,
  resetRoom,
  toRoomInfo,
} from "../engine/room-manager.js";
import { startGame, processMove, getPlayerView, hasPlayerView } from "../engine/game-engine.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

function emitStateToRoom(
  io: AppServer,
  room: { code: string; gameId: string; gameState: unknown; socketToPlayer: Map<string, string> },
  event: "game:started" | "game:stateUpdated",
  state: unknown
) {
  if (!hasPlayerView(room.gameId)) {
    io.to(room.code).emit(event, state);
    return;
  }
  for (const [socketId, playerId] of room.socketToPlayer) {
    const view = getPlayerView(room.gameId, state, playerId);
    io.to(socketId).emit(event, view);
  }
}

export function registerGameHandlers(io: AppServer, socket: AppSocket) {
  socket.on("game:start", () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return socket.emit("error", "ルームに参加していません");

    const playerId = getPlayerIdBySocket(room, socket.id);
    if (playerId !== room.hostId) return socket.emit("error", "ホストのみ開始できます");
    if (room.players.length < 2) return socket.emit("error", "プレイヤーが足りません");

    if (room.status === "finished") {
      resetRoom(room);
    }

    try {
      const playerIds = room.players.map((p) => p.id);
      // シャッフルして毎回順番をランダムにする
      for (let i = playerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
      }
      const state = startGame(room.gameId, playerIds, room.hostId);
      room.status = "playing";
      room.gameState = state;
      io.to(room.code).emit("room:updated", toRoomInfo(room));
      emitStateToRoom(io, room, "game:started", state);
    } catch (e: unknown) {
      socket.emit("error", (e as Error).message);
    }
  });

  socket.on("game:move", (move) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== "playing" || !room.gameState) {
      return socket.emit("error", "ゲームが進行中ではありません");
    }

    const playerId = getPlayerIdBySocket(room, socket.id);
    if (!playerId) return socket.emit("error", "プレイヤーが見つかりません");

    const result = processMove(room.gameId, room.gameState, move, playerId);
    if ("error" in result) {
      return socket.emit("error", result.error);
    }

    room.gameState = result.newState;
    emitStateToRoom(io, room, "game:stateUpdated", result.newState);

    if (result.result) {
      room.status = "finished";
      room.gameResult = result.result;
      io.to(room.code).emit("room:updated", toRoomInfo(room));
      io.to(room.code).emit("game:ended", result.result);
    }
  });
}
