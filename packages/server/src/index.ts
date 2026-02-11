import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import { registerRoomHandlers } from "./handlers/room-handlers.js";
import { registerGameHandlers } from "./handlers/game-handlers.js";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
