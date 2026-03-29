import type { PlayerCardStyle } from "@bodobako/shared";
import { BG_PATTERNS, PRESET_ACCENT_COLORS, getAllGames, getGameDefinition } from "@bodobako/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RoomSession } from "./RoomSession.js";
import * as r2UserStorage from "./lib/r2UserStorage.js";
import { verifyFirebaseToken } from "./lib/verifyFirebaseToken.js";

export { RoomSession };

// 4文字ルームコード生成
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  return Array.from({ length: 4 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

interface Env {
  ROOM_SESSION: DurableObjectNamespace;
  USER_DATA: R2Bucket;
  FIREBASE_PROJECT_ID: string;
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

  const profile = await r2UserStorage.getProfile(c.env.USER_DATA, verified.uid);
  if (!profile) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json(profile);
});

app.put("/users/me/avatar", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const bucket = c.env.USER_DATA;
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "multipart/form-data で送信してください" }, 400);
  }

  const formData = await c.req.raw.formData();
  const file = formData.get("avatar") as unknown;

  if (!file || typeof file === "string" || !(file instanceof Blob)) {
    return c.json({ error: "avatar フィールドが必要です" }, 400);
  }

  const blob = file as Blob & { name?: string; type: string };
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(blob.type)) {
    return c.json({ error: "JPEG、PNG、WebP のみ対応しています" }, 400);
  }

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (blob.size > MAX_SIZE) {
    return c.json({ error: "ファイルサイズは 2MB 以下にしてください" }, 400);
  }

  const data = await blob.arrayBuffer();
  await r2UserStorage.putAvatar(bucket, verified.uid, data, blob.type);

  const origin = new URL(c.req.url).origin;
  const avatarUrl = `${origin}/users/${verified.uid}/avatar`;
  await r2UserStorage.updateProfilePhotoURL(bucket, verified.uid, avatarUrl);

  return c.json({ photoURL: avatarUrl });
});

app.delete("/users/me/avatar", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const bucket = c.env.USER_DATA;
  await Promise.all([
    bucket.delete(`users/${verified.uid}/avatar`),
    r2UserStorage.updateProfileFields(bucket, verified.uid, { photoURL: "" }),
  ]);

  return c.json({ ok: true });
});

app.get("/users/:uid/avatar", async (c) => {
  const uid = c.req.param("uid");
  const bucket = c.env.USER_DATA;
  const obj = await r2UserStorage.getAvatar(bucket, uid);

  if (!obj) return c.notFound();

  const contentType = obj.httpMetadata?.contentType ?? "image/jpeg";
  return new Response(obj.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
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

  const existingProfile = await r2UserStorage.getProfile(c.env.USER_DATA, verified.uid);
  let profile;
  if (existingProfile) {
    // displayName は常に更新。photoURL はまだ未設定（""）の場合のみ上書き（カスタムアバターを保護）
    const fields: { displayName: string; photoURL?: string } = { displayName: displayName.trim() };
    if (!existingProfile.photoURL && typeof photoURL === "string" && photoURL) {
      fields.photoURL = photoURL;
    }
    profile = await r2UserStorage.updateProfileFields(c.env.USER_DATA, verified.uid, fields);
  } else {
    profile = await r2UserStorage.upsertProfile(
      c.env.USER_DATA,
      verified.uid,
      displayName.trim(),
      typeof photoURL === "string" ? photoURL : "",
    );
  }
  return c.json(profile);
});

// カードスタイル更新
app.put("/users/me/card-style", async (c) => {
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

  const { accentColor, bgPattern } = body as Record<string, unknown>;

  if (accentColor !== undefined) {
    if (typeof accentColor !== "string" || !(PRESET_ACCENT_COLORS as readonly string[]).includes(accentColor)) {
      return c.json({ error: "accentColor が不正な値です" }, 400);
    }
  }
  if (bgPattern !== undefined) {
    if (typeof bgPattern !== "string" || !(BG_PATTERNS as readonly string[]).includes(bgPattern)) {
      return c.json({ error: "bgPattern が不正な値です" }, 400);
    }
  }

  const cardStyle: PlayerCardStyle = {
    ...(accentColor !== undefined ? { accentColor } : {}),
    ...(bgPattern !== undefined ? { bgPattern: bgPattern as import("@bodobako/shared").BgPattern } : {}),
  };

  const profile = await r2UserStorage.updateProfileFields(c.env.USER_DATA, verified.uid, { cardStyle });
  if (!profile) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json({ cardStyle: profile.cardStyle });
});

// お気に入りゲーム更新
app.put("/users/me/favorites", async (c) => {
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

  const { gameIds } = body as Record<string, unknown>;
  if (!Array.isArray(gameIds) || !gameIds.every((id) => typeof id === "string")) {
    return c.json({ error: "gameIds は文字列の配列で指定してください" }, 400);
  }

  const validIds = new Set(getAllGames().map((g) => g.id));
  if (gameIds.some((id) => !validIds.has(id))) {
    return c.json({ error: "無効なゲームIDが含まれています" }, 400);
  }

  const profile = await r2UserStorage.updateProfileFields(c.env.USER_DATA, verified.uid, {
    favoriteGames: gameIds as string[],
  });
  if (!profile) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json({ favoriteGames: profile.favoriteGames ?? [] });
});

// ---------------------------------------------------------------------------
// フレンド API（Firebase 認証必須）
// ---------------------------------------------------------------------------

// ユーザープロフィール取得（公開情報）
app.get("/users/:uid/profile", async (c) => {
  const uid = c.req.param("uid");
  if (!uid) return c.json({ error: "uid は必須です" }, 400);

  const profile = await r2UserStorage.getProfile(c.env.USER_DATA, uid);
  if (!profile) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json({ uid: profile.uid, displayName: profile.displayName, photoURL: profile.photoURL, cardStyle: profile.cardStyle });
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

  const profile = await r2UserStorage.getProfileByFriendCode(c.env.USER_DATA, rawCode);
  if (!profile) return c.json({ error: "ユーザーが見つかりません" }, 404);
  return c.json(profile);
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

  const friend = await r2UserStorage.getProfileByFriendCode(c.env.USER_DATA, rawCode);
  if (!friend) return c.json({ error: "ユーザーが見つかりません" }, 404);
  if (friend.uid === verified.uid) return c.json({ error: "自分自身をフレンドに追加できません" }, 400);

  const { alreadyExists } = await r2UserStorage.addFollow(c.env.USER_DATA, verified.uid, friend.uid);
  if (alreadyExists) return c.json({ error: "すでにフレンドです" }, 409);
  return c.json(friend);
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

  const friendProfile = await r2UserStorage.getProfile(c.env.USER_DATA, friendUid);
  if (!friendProfile) return c.json({ error: "ユーザーが見つかりません" }, 404);

  const { alreadyExists } = await r2UserStorage.addFollow(c.env.USER_DATA, verified.uid, friendUid);
  if (alreadyExists) return c.json({ ok: true });
  return c.json(friendProfile);
});

// フレンド一覧取得
app.get("/users/me/friends", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friends = await r2UserStorage.getFollowing(c.env.USER_DATA, verified.uid);
  return c.json(friends);
});

// 招待一覧取得（既定: unread）
app.get("/users/me/invites", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const statusParam = c.req.query("status") ?? "unread";
  const statusFilter = statusParam === "all" ? "all" : "unread";
  const invites = await r2UserStorage.getInvites(c.env.USER_DATA, verified.uid, statusFilter);

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

  await r2UserStorage.markInviteRead(c.env.USER_DATA, verified.uid, inviteId);
  return c.json({ ok: true });
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

  const result = await r2UserStorage.addInvites(
    c.env.USER_DATA,
    verified.uid,
    roomMeta.inviterName,
    code,
    roomMeta.gameId,
    invitedUids,
  );
  return c.json(result);
});

// フォロワー一覧取得
app.get("/users/me/followers", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const followers = await r2UserStorage.getFollowers(c.env.USER_DATA, verified.uid);
  return c.json(followers);
});

// フレンド削除
app.delete("/users/me/friends/:uid", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friendUid = c.req.param("uid");
  await r2UserStorage.removeFollow(c.env.USER_DATA, verified.uid, friendUid);
  return c.json({ ok: true });
});

// フレンド削除（相互）
app.delete("/users/me/friends/:uid/mutual", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const friendUid = c.req.param("uid");
  await Promise.all([
    r2UserStorage.removeFollow(c.env.USER_DATA, verified.uid, friendUid),
    r2UserStorage.removeFollow(c.env.USER_DATA, friendUid, verified.uid),
  ]);
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
  await r2UserStorage.removeFollow(c.env.USER_DATA, verified.uid, targetUid);
  return c.json({ ok: true });
});

// 申請承認（自分 -> 申請者 を追加して相互化）
app.post("/users/me/friend-requests/:uid/approve", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const requesterUid = c.req.param("uid");
  const requesterProfile = await r2UserStorage.getProfile(c.env.USER_DATA, requesterUid);
  if (!requesterProfile) return c.json({ error: "ユーザーが見つかりません" }, 404);

  const { alreadyExists } = await r2UserStorage.addFollow(c.env.USER_DATA, verified.uid, requesterUid);
  if (alreadyExists) return c.json({ ok: true });
  return c.json(requesterProfile);
});

// 申請拒否（申請者 -> 自分 の一方向解除）
app.post("/users/me/friend-requests/:uid/reject", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return c.json({ error: "認証が必要です" }, 401);

  const verified = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  if (!verified) return c.json({ error: "認証トークンが無効です" }, 401);

  const requesterUid = c.req.param("uid");
  await r2UserStorage.removeFollow(c.env.USER_DATA, requesterUid, verified.uid);
  return c.json({ ok: true });
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
