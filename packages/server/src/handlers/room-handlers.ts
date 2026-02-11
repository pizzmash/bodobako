import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@claude-demo/shared";
import {
  createRoom,
  joinRoom,
  removePlayer,
  toRoomInfo,
} from "../engine/room-manager.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(io: AppServer, socket: AppSocket) {
  socket.on("room:create", (playerName, gameId, cb) => {
    const room = createRoom(socket.id, playerName, gameId);
    socket.join(room.code);
    cb(room.code);
    io.to(room.code).emit("room:updated", toRoomInfo(room));
  });

  socket.on("room:join", (roomCode, playerName, cb) => {
    const result = joinRoom(roomCode, socket.id, playerName);
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

  socket.on("disconnect", () => {
    const room = removePlayer(socket.id);
    if (room) {
      io.to(room.code).emit("room:updated", toRoomInfo(room));
    }
  });
}
