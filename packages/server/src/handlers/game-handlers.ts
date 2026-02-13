import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import {
  getRoomBySocket,
  getPlayerIdBySocket,
  resetRoom,
  toRoomInfo,
} from "../engine/room-manager.js";
import { startGame, processMove } from "../engine/game-engine.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

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
      const state = startGame(room.gameId, playerIds);
      room.status = "playing";
      room.gameState = state;
      io.to(room.code).emit("room:updated", toRoomInfo(room));
      io.to(room.code).emit("game:started", state);
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
    io.to(room.code).emit("game:stateUpdated", result.newState);

    if (result.result) {
      room.status = "finished";
      room.gameResult = result.result;
      io.to(room.code).emit("room:updated", toRoomInfo(room));
      io.to(room.code).emit("game:ended", result.result);
    }
  });
}
