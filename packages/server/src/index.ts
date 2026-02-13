import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import { registerRoomHandlers } from "./handlers/room-handlers.js";
import { registerGameHandlers } from "./handlers/game-handlers.js";
import { getAdminSnapshot, getRoom } from "./engine/room-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const startTime = Date.now();

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

// --- Admin routes ---

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "../admin/index.html"));
});

app.get("/admin/api/stats", (_req, res) => {
  const snapshot = getAdminSnapshot();
  res.json({
    uptime: Date.now() - startTime,
    socketCount: io.engine.clientsCount,
    roomCount: snapshot.roomCount,
    sessionCount: snapshot.sessionCount,
    disconnectTimerCount: snapshot.disconnectTimerCount,
    roomsByStatus: {
      waiting: snapshot.rooms.filter((r) => r.status === "waiting").length,
      playing: snapshot.rooms.filter((r) => r.status === "playing").length,
      finished: snapshot.rooms.filter((r) => r.status === "finished").length,
    },
  });
});

app.get("/admin/api/rooms", (_req, res) => {
  const snapshot = getAdminSnapshot();
  res.json(snapshot.rooms);
});

app.get("/admin/api/rooms/:code", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) {
    res.status(404).json({ error: "ルームが見つかりません" });
    return;
  }
  const players = room.players.map((p) => {
    const isConnected = Array.from(room.socketToPlayer.values()).includes(p.id);
    return {
      id: p.id,
      name: p.name,
      connected: isConnected,
      isHost: p.id === room.hostId,
    };
  });
  res.json({
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    hostId: room.hostId,
    players,
    gameState: room.gameState,
    gameResult: room.gameResult,
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
