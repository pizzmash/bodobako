import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import {
  createRoom,
  joinRoom,
  removePlayer,
  reconnectPlayer,
  scheduleRemoval,
  toRoomInfo,
} from "../engine/room-manager.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const DISCONNECT_GRACE_PERIOD_MS = 30_000;

export function registerRoomHandlers(io: AppServer, socket: AppSocket) {
  socket.on("room:create", (playerName, gameId, sessionToken, cb) => {
    const room = createRoom(socket.id, playerName, gameId, sessionToken);
    socket.join(room.code);
    cb(room.code);
    io.to(room.code).emit("room:updated", toRoomInfo(room));
  });

  socket.on("room:join", (roomCode, playerName, sessionToken, cb) => {
    const result = joinRoom(roomCode, socket.id, playerName, sessionToken);
    if ("error" in result) {
      cb({ ok: false, error: result.error });
      return;
    }
    socket.join(roomCode);
    cb({ ok: true, room: toRoomInfo(result.room), playerId: result.playerId });
    io.to(roomCode).emit("room:updated", toRoomInfo(result.room));
  });

  socket.on("room:leave", () => {
    const room = removePlayer(socket.id);
    socket.leave(room?.code ?? "");
    socket.emit("room:left");
    if (room) {
      io.to(room.code).emit("room:updated", toRoomInfo(room));
    }
  });

  socket.on("session:reconnect", (sessionToken, cb) => {
    const result = reconnectPlayer(sessionToken, socket.id);
    if (!result) {
      cb({ success: false });
      return;
    }
    const { room, playerId } = result;
    socket.join(room.code);
    cb({
      success: true,
      room: toRoomInfo(room),
      playerId,
      gameState: room.gameState,
      gameResult: room.gameResult,
    });
    io.to(room.code).emit("room:updated", toRoomInfo(room));
  });

  socket.on("disconnect", () => {
    scheduleRemoval(socket.id, DISCONNECT_GRACE_PERIOD_MS, (room) => {
      io.to(room.code).emit("room:updated", toRoomInfo(room));
    });
  });
}
