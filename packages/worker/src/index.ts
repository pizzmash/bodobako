import { Hono } from "hono";
import { cors } from "hono/cors";
import { getGameDefinition } from "@bodobako/shared";
import { RoomDO } from "./RoomDO.js";
import { RoomRegistry } from "./RoomRegistry.js";
import { UserRegistry } from "./UserRegistry.js";
import { verifyFirebaseToken } from "./lib/verifyFirebaseToken.js";

export { RoomDO, RoomRegistry, UserRegistry };

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
  USER_REGISTRY: DurableObjectNamespace;
  FIREBASE_PROJECT_ID: string;
}

function getRegistry(env: Env) {
  return env.REGISTRY.get(env.REGISTRY.idFromName("global"));
}

function getUserRegistry(env: Env) {
  return env.USER_REGISTRY.get(env.USER_REGISTRY.idFromName("global"));
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

  const { playerName, gameId, sessionToken, idToken } = body as Record<string, unknown>;

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

  // idToken が提供された場合は Firebase で検証して userId を取得
  let userId: string | undefined;
  if (typeof idToken === "string" && idToken) {
    const verified = await verifyFirebaseToken(idToken, c.env.FIREBASE_PROJECT_ID);
    if (verified) userId = verified.uid;
  }

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
    body: JSON.stringify({ code, gameId: trimmedGameId, playerName: trimmedPlayerName, sessionToken, userId }),
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
// ユーザープロフィール API（Firebase 認証必須）
// ---------------------------------------------------------------------------

app.get("/users/me", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request(`http://do/users/${verified.uid}`));
  if (res.status === 404) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json(await res.json());
});

app.put("/users/me", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  const { displayName, photoURL } = body as Record<string, unknown>;
  if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 20) {
    return c.json({ error: "displayName は1〜20文字で入力してください" }, 400);
  }

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request("http://do/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: verified.uid,
      displayName: displayName.trim(),
      photoURL: typeof photoURL === "string" ? photoURL : "",
    }),
  }));
  return c.json(await res.json(), res.status as 200 | 400);
});

// ---------------------------------------------------------------------------
// フレンド API（Firebase 認証必須）
// ---------------------------------------------------------------------------

// フレンドコードでユーザー検索
app.get("/users/search", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const rawCode = (c.req.query("friendCode") ?? "").replace(/-/g, "").toUpperCase();
  if (rawCode.length !== 8) return c.json({ error: "フレンドコードは8文字で入力してください" }, 400);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request(`http://do/users/by-friend-code/${rawCode}`));
  if (res.status === 404) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json(await res.json(), res.status as 200);
});

// フレンド追加
app.post("/users/me/friends", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }
  const { friendCode } = body as Record<string, unknown>;
  if (typeof friendCode !== "string") return c.json({ error: "friendCode は必須です" }, 400);

  const rawCode = friendCode.replace(/-/g, "").toUpperCase();
  if (rawCode.length !== 8) return c.json({ error: "フレンドコードは8文字で入力してください" }, 400);

  const userRegistry = getUserRegistry(c.env);

  // フレンドコードでユーザーを検索
  const searchRes = await userRegistry.fetch(new Request(`http://do/users/by-friend-code/${rawCode}`));
  if (searchRes.status === 404) return c.json({ error: "ユーザーが見つかりません" }, 404);

  const friend = await searchRes.json<{ uid: string; displayName: string; friendCode: string }>();
  if (friend.uid === verified.uid) return c.json({ error: "自分自身をフレンドに追加できません" }, 400);

  // フレンド関係を追加
  const addRes = await userRegistry.fetch(new Request("http://do/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerUid: verified.uid, friendUid: friend.uid }),
  }));
  return c.json(await addRes.json(), addRes.status as 200 | 400 | 404 | 409);
});

// フレンド一覧取得
app.get("/users/me/friends", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request(`http://do/friends/${verified.uid}`));
  return c.json(await res.json());
});

// フォロワー一覧取得
app.get("/users/me/followers", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request(`http://do/followers/${verified.uid}`));
  return c.json(await res.json());
});

// フレンド削除
app.delete("/users/me/friends/:uid", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friendUid = c.req.param("uid");
  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(
    new Request(`http://do/friends/${verified.uid}/${friendUid}`, { method: "DELETE" })
  );
  return c.json(await res.json(), res.status as 200);
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
