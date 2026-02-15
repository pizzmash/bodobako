import type { ClientToServerEvents, ServerToClientEvents } from "@bodobako/shared";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { getAdminSnapshot, getRoom } from "./engine/room-manager.js";
import { registerGameHandlers } from "./handlers/game-handlers.js";
import { registerRoomHandlers } from "./handlers/room-handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const startTime = Date.now();

const app = new Hono();

// --- Admin routes ---

app.get("/admin", async (c) => {
  const html = await readFile(path.join(__dirname, "../admin/index.html"), "utf-8");
  return c.html(html);
});

app.get("/admin/api/stats", (c) => {
  const snapshot = getAdminSnapshot();
  return c.json({
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

app.get("/admin/api/rooms", (c) => {
  const snapshot = getAdminSnapshot();
  return c.json(snapshot.rooms);
});

app.get("/admin/api/rooms/:code", (c) => {
  const room = getRoom(c.req.param("code"));
  if (!room) {
    return c.json({ error: "ルームが見つかりません" }, 404);
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
  return c.json({
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    hostId: room.hostId,
    players,
    gameState: room.gameState,
    gameResult: room.gameResult,
  });
});

// Create HTTP server with Hono app
const PORT = Number(process.env.PORT ?? 3001);
const httpServer = serve({
  fetch: app.fetch,
  port: PORT,
  createServer,
});

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

console.log(`Server running on http://localhost:${PORT}`);
