import { Hono } from "hono";
import { cors } from "hono/cors";
import { RoomDO } from "./RoomDO.js";

export { RoomDO };

// 4文字ルームコード生成
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  return Array.from({ length: 4 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

interface Env {
  ROOM_DO: DurableObjectNamespace;
  ROOM_REGISTRY: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*" }));

// ---------------------------------------------------------------------------
// ルーム作成
// POST /rooms  body: { playerName, gameId, sessionToken }
// ---------------------------------------------------------------------------
app.post("/rooms", async (c) => {
  const { playerName, gameId, sessionToken } = await c.req.json<{
    playerName: string;
    gameId: string;
    sessionToken: string;
  }>();

  if (!playerName || !gameId || !sessionToken) {
    return c.json({ error: "playerName, gameId, sessionToken は必須です" }, 400);
  }

  // KVで重複しないコードを生成
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    if (attempts++ > 20) return c.json({ error: "ルームコード生成に失敗しました" }, 500);
  } while (await c.env.ROOM_REGISTRY.get(code));

  const doId = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(doId);

  const initRes = await stub.fetch(new Request("http://do/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, gameId, playerName, sessionToken }),
  }));

  if (!initRes.ok) {
    const err = await initRes.json<{ error: string }>();
    return c.json({ error: err.error }, initRes.status as 400 | 409 | 500);
  }

  const { playerId } = await initRes.json<{ playerId: string }>();

  // KVにコードを登録（TTL: 24時間）
  await c.env.ROOM_REGISTRY.put(code, doId.toString(), { expirationTtl: 86400 });

  return c.json({ code, playerId });
});

// ---------------------------------------------------------------------------
// WebSocket接続
// GET /rooms/:code/ws?sessionToken=...
// ---------------------------------------------------------------------------
app.get("/rooms/:code/ws", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const sessionToken = c.req.query("sessionToken") ?? "";

  const kvEntry = await c.env.ROOM_REGISTRY.get(code);
  if (!kvEntry) {
    return c.json({ error: "ルームが見つかりません" }, 404);
  }

  const doId = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(doId);

  return stub.fetch(new Request(`http://do/ws?sessionToken=${encodeURIComponent(sessionToken)}`, {
    headers: c.req.raw.headers,
  }));
});

// ---------------------------------------------------------------------------
// 管理API
// ---------------------------------------------------------------------------
app.get("/admin/api/rooms", async (c) => {
  const list = await c.env.ROOM_REGISTRY.list();
  const rooms = await Promise.all(
    list.keys.map(async ({ name: code }) => {
      const doId = c.env.ROOM_DO.idFromName(code);
      const stub = c.env.ROOM_DO.get(doId);
      const res = await stub.fetch(new Request("http://do/info"));
      if (!res.ok) return null;
      return res.json();
    })
  );
  return c.json(rooms.filter(Boolean));
});

app.get("/admin/api/rooms/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const doId = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(doId);
  const res = await stub.fetch(new Request("http://do/info"));
  if (!res.ok) return c.json({ error: "ルームが見つかりません" }, 404);
  return c.json(await res.json());
});

export default app;
