import { getGameDefinition } from "@bodobako/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RoomSession } from "./RoomSession.js";
import { UserRegistry } from "./UserRegistry.js";
import { verifyFirebaseToken } from "./lib/verifyFirebaseToken.js";

export { RoomSession, UserRegistry };

// 4文字ルームコード生成
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  return Array.from({ length: 4 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

interface Env {
  ROOM_SESSION: DurableObjectNamespace;
  USER_REGISTRY: DurableObjectNamespace;
  FIREBASE_PROJECT_ID: string;
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

  // 重複しないコードを生成（RoomSession の /exists で確認）
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    if (attempts++ > 20) return c.json({ error: "ルームコード生成に失敗しました" }, 500);
    const stub = c.env.ROOM_SESSION.get(c.env.ROOM_SESSION.idFromName(code));
    const check = await stub.fetch(new Request("http://do/exists"));
    if (check.status === 404) break; // コードが未使用
  } while (true);

  const stub = c.env.ROOM_SESSION.get(c.env.ROOM_SESSION.idFromName(code));

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

  return c.json({ code, playerId });
});

// ---------------------------------------------------------------------------
// WebSocket接続
// GET /rooms/:code/ws?sessionToken=...
// ---------------------------------------------------------------------------
app.get("/rooms/:code/ws", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const sessionToken = c.req.query("sessionToken") ?? "";

  const stub = c.env.ROOM_SESSION.get(c.env.ROOM_SESSION.idFromName(code));
  const check = await stub.fetch(new Request("http://do/exists"));
  if (!check.ok) {
    return c.json({ error: "ルームが見つかりません" }, 404);
  }

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

// ユーザープロフィール取得（公開情報）
app.get("/users/:uid/profile", async (c) => {
  const uid = c.req.param("uid");
  if (!uid) return c.json({ error: "uid は必須です" }, 400);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request(`http://do/users/${uid}`));
  if (res.status === 404) return c.json({ error: "ユーザーが見つかりません" }, 404);
  if (!res.ok) return c.json({ error: "プロフィール取得に失敗しました" }, 400);

  const profile = await res.json<{ uid: string; displayName: string; photoURL?: string }>();
  return c.json({
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL ?? "",
  });
});

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

// UID指定でフレンド申請（自分 -> 相手）
app.post("/users/me/friend-requests/:uid", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friendUid = c.req.param("uid");
  if (!friendUid) return c.json({ error: "uid は必須です" }, 400);
  if (friendUid === verified.uid) return c.json({ error: "自分自身には申請できません" }, 400);

  const userRegistry = getUserRegistry(c.env);
  const addRes = await userRegistry.fetch(new Request("http://do/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerUid: verified.uid, friendUid }),
  }));

  if (addRes.status === 409) return c.json({ ok: true });
  return c.json(await addRes.json(), addRes.status as 200 | 400 | 404);
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

// 招待一覧取得（既定: unread）
app.get("/users/me/invites", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const status = c.req.query("status") ?? "unread";
  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(
    new Request(`http://do/invites/${verified.uid}?status=${encodeURIComponent(status)}`)
  );
  if (!res.ok) return c.json(await res.json(), res.status as 200 | 400);

  const invites = await res.json<Array<{
    inviteId: string;
    inviterName: string;
    roomCode: string;
    gameId: string;
    createdAt: number;
  }>>();

  const activeInvites = await Promise.all(invites.map(async (invite) => {
    try {
      const roomStub = c.env.ROOM_SESSION.get(c.env.ROOM_SESSION.idFromName(invite.roomCode));
      const infoRes = await roomStub.fetch(new Request("http://do/info"));
      if (!infoRes.ok) return null;
      return invite;
    } catch {
      return null;
    }
  }));

  return c.json(activeInvites.filter((invite) => invite !== null));
});

// 招待既読化
app.post("/users/me/invites/:inviteId/read", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const inviteId = c.req.param("inviteId");
  if (!inviteId) return c.json({ error: "inviteId は必須です" }, 400);

  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(
    new Request(`http://do/invites/${verified.uid}/${inviteId}/read`, { method: "POST" })
  );
  return c.json(await res.json(), res.status as 200 | 400);
});

// ルーム作成後のフレンド招待（Firebase 認証必須）
app.post("/rooms/:code/invites", async (c) => {
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

  if (typeof body !== "object" || body === null) {
    return c.json({ error: "リクエストボディが不正です" }, 400);
  }

  const { invitedUids } = body as Record<string, unknown>;
  if (!Array.isArray(invitedUids)) {
    return c.json({ error: "invitedUids は配列で指定してください" }, 400);
  }

  const code = c.req.param("code").toUpperCase();
  const roomStub = c.env.ROOM_SESSION.get(c.env.ROOM_SESSION.idFromName(code));
  const metaRes = await roomStub.fetch(
    new Request(`http://do/invite-meta?uid=${encodeURIComponent(verified.uid)}`)
  );
  if (!metaRes.ok) {
    if (metaRes.status === 404) return c.json({ error: "ルームが見つかりません" }, 404);
    if (metaRes.status === 403) return c.json({ error: "このルームの参加者のみ招待できます" }, 403);
    return c.json({ error: "招待の作成に失敗しました" }, 400);
  }

  const roomMeta = await metaRes.json<{
    status: "waiting" | "playing" | "finished";
    gameId: string;
    inviterName: string;
    isHost: boolean;
  }>();
  if (!roomMeta.isHost) {
    return c.json({ error: "ホストのみ招待できます" }, 403);
  }
  if (roomMeta.status !== "waiting") {
    return c.json({ error: "待機中のルームでのみ招待できます" }, 409);
  }

  const userRegistry = getUserRegistry(c.env);
  const inviteRes = await userRegistry.fetch(new Request("http://do/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inviterUid: verified.uid,
      inviterName: roomMeta.inviterName,
      roomCode: code,
      gameId: roomMeta.gameId,
      invitedUids,
    }),
  }));

  return c.json(await inviteRes.json(), inviteRes.status as 200 | 400);
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

// フレンド削除（相互）
app.delete("/users/me/friends/:uid/mutual", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friendUid = c.req.param("uid");
  const userRegistry = getUserRegistry(c.env);

  await userRegistry.fetch(
    new Request(`http://do/friends/${verified.uid}/${friendUid}`, { method: "DELETE" })
  );
  await userRegistry.fetch(
    new Request(`http://do/friends/${friendUid}/${verified.uid}`, { method: "DELETE" })
  );

  return c.json({ ok: true });
});

// 申請取り下げ（自分 -> 相手 の一方向解除）
app.delete("/users/me/friend-requests/:uid", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const targetUid = c.req.param("uid");
  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(
    new Request(`http://do/friends/${verified.uid}/${targetUid}`, { method: "DELETE" })
  );
  return c.json(await res.json(), res.status as 200);
});

// 申請承認（自分 -> 申請者 を追加して相互化）
app.post("/users/me/friend-requests/:uid/approve", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const requesterUid = c.req.param("uid");
  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(new Request("http://do/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerUid: verified.uid, friendUid: requesterUid }),
  }));

  if (res.status === 409) {
    return c.json({ ok: true });
  }
  return c.json(await res.json(), res.status as 200 | 400 | 404);
});

// 申請拒否（申請者 -> 自分 の一方向解除）
app.post("/users/me/friend-requests/:uid/reject", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const requesterUid = c.req.param("uid");
  const userRegistry = getUserRegistry(c.env);
  const res = await userRegistry.fetch(
    new Request(`http://do/friends/${requesterUid}/${verified.uid}`, { method: "DELETE" })
  );
  return c.json(await res.json(), res.status as 200);
});

// ---------------------------------------------------------------------------
// 管理API
// ---------------------------------------------------------------------------
app.get("/admin/api/rooms/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const doId = c.env.ROOM_SESSION.idFromName(code);
  const stub = c.env.ROOM_SESSION.get(doId);
  const res = await stub.fetch(new Request("http://do/info"));
  if (!res.ok) return c.json({ error: "ルームが見つかりません" }, 404);
  return c.json(await res.json());
});

export default app;
