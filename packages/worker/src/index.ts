import { Hono } from "hono";
import { cors } from "hono/cors";
import { getGameDefinition } from "@bodobako/shared";
import { RoomDO } from "./RoomDO.js";
import { RoomRegistry } from "./RoomRegistry.js";

export { RoomDO, RoomRegistry };

// 4文字ルームコード生成
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  return Array.from({ length: 4 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

interface Env {
  ROOM_DO: DurableObjectNamespace;
  REGISTRY: DurableObjectNamespace;
}

function getRegistry(env: Env) {
  return env.REGISTRY.get(env.REGISTRY.idFromName("global"));
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*" }));

// ---------------------------------------------------------------------------
// ヘルスチェック（Playwright E2E テスト用）
// ---------------------------------------------------------------------------
app.get("/health", (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// ルーム作成
// POST /rooms  body: { playerName, gameId, sessionToken }
// ---------------------------------------------------------------------------
app.post("/rooms", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  const { playerName, gameId, sessionToken } = body as Record<string, unknown>;

  if (typeof playerName !== "string" || !playerName.trim() || playerName.trim().length > 20) {
    return c.json({ error: "playerName は1〜20文字の文字列で入力してください" }, 400);
  }
  if (typeof gameId !== "string" || !gameId.trim()) {
    return c.json({ error: "gameId は必須です" }, 400);
  }
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    return c.json({ error: "sessionToken は必須です" }, 400);
  }

  // gameId の存在確認
  if (!getGameDefinition(gameId)) {
    return c.json({ error: `不明なゲームID: ${gameId}` }, 400);
  }

  const trimmedPlayerName = playerName.trim();
  const trimmedGameId = gameId.trim();

  const registry = getRegistry(c.env);

  // SQLiteレジストリで重複しないコードを生成
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    if (attempts++ > 20) return c.json({ error: "ルームコード生成に失敗しました" }, 500);
    const check = await registry.fetch(new Request(`http://do/rooms/${code}`));
    if (check.status === 404) break; // コードが未使用
  } while (true);

  const doId = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(doId);

  const initRes = await stub.fetch(new Request("http://do/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, gameId: trimmedGameId, playerName: trimmedPlayerName, sessionToken }),
  }));

  if (!initRes.ok) {
    const err = await initRes.json<{ error: string }>();
    return c.json({ error: err.error }, initRes.status as 400 | 409 | 500);
  }

  const { playerId } = await initRes.json<{ playerId: string }>();

  // SQLiteレジストリにコードを登録
  await registry.fetch(new Request("http://do/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }));

  return c.json({ code, playerId });
});

// ---------------------------------------------------------------------------
// WebSocket接続
// GET /rooms/:code/ws?sessionToken=...
// ---------------------------------------------------------------------------
app.get("/rooms/:code/ws", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const sessionToken = c.req.query("sessionToken") ?? "";

  const registry = getRegistry(c.env);
  const check = await registry.fetch(new Request(`http://do/rooms/${code}`));
  if (!check.ok) {
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
  const registry = getRegistry(c.env);
  const codesRes = await registry.fetch(new Request("http://do/rooms"));
  const codes = await codesRes.json<string[]>();

  const rooms = await Promise.all(
    codes.map(async (code) => {
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
