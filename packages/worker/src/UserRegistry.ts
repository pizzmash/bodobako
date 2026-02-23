const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode(): string {
  return Array.from({ length: 8 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

export class UserRegistry implements DurableObject {
  private state: DurableObjectState;
  private db!: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.db = state.storage.sql;
    this.state.blockConcurrencyWhile(async () => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          friend_code TEXT NOT NULL DEFAULT '',
          photo_url TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
      // 既存テーブルへの列追加（すでに存在する場合はエラーを無視）
      for (const col of ["friend_code TEXT NOT NULL DEFAULT ''", "photo_url TEXT NOT NULL DEFAULT ''"]) {
        try { this.db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* ignore */ }
      }
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS friends (
          owner_uid TEXT NOT NULL,
          friend_uid TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (owner_uid, friend_uid)
        )
      `);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET /users/by-friend-code/:code
    const matchByCode = url.pathname.match(/^\/users\/by-friend-code\/(.+)$/);
    if (matchByCode && request.method === "GET") {
      const code = matchByCode[1].toUpperCase();
      const row = this.db.exec(
        "SELECT uid, display_name, friend_code, photo_url FROM users WHERE friend_code = ?",
        code
      ).toArray()[0] ?? null;
      if (!row) return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
      return Response.json({
        uid: row.uid,
        displayName: row.display_name,
        friendCode: row.friend_code,
        photoURL: row.photo_url,
      });
    }

    // GET /users/:uid
    const matchGet = url.pathname.match(/^\/users\/(.+)$/);
    if (matchGet && request.method === "GET") {
      const uid = matchGet[1];
      const row = this.db.exec(
        "SELECT uid, display_name, friend_code, photo_url FROM users WHERE uid = ?",
        uid
      ).toArray()[0] ?? null;
      if (!row) return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
      return Response.json({
        uid: row.uid,
        displayName: row.display_name,
        friendCode: row.friend_code,
        photoURL: row.photo_url,
      });
    }

    // POST /users — upsert
    if (url.pathname === "/users" && request.method === "POST") {
      let body: unknown;
      try { body = await request.json(); } catch {
        return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
      }
      if (typeof body !== "object" || body === null) {
        return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
      }
      const { uid, displayName, photoURL } = body as Record<string, unknown>;
      if (typeof uid !== "string" || !uid) {
        return Response.json({ error: "uid は必須です" }, { status: 400 });
      }
      if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 20) {
        return Response.json({ error: "displayName は1〜20文字で入力してください" }, { status: 400 });
      }
      const now = Date.now();
      const trimmedName = displayName.trim();
      const photoURLStr = typeof photoURL === "string" ? photoURL : "";

      const existing = this.db.exec(
        "SELECT friend_code FROM users WHERE uid = ?",
        uid
      ).toArray()[0] ?? null;
      let friendCode = (existing?.friend_code as string) || "";

      if (!friendCode) {
        let attempts = 0;
        do {
          friendCode = generateFriendCode();
          const conflict = this.db.exec(
            "SELECT 1 FROM users WHERE friend_code = ?",
            friendCode
          ).toArray()[0] ?? null;
          if (!conflict) break;
          if (++attempts > 20) throw new Error("フレンドコード生成に失敗しました");
        } while (true);
      }

      this.db.exec(
        `INSERT INTO users (uid, display_name, friend_code, photo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           display_name = excluded.display_name,
           photo_url = excluded.photo_url,
           updated_at = excluded.updated_at`,
        uid, trimmedName, friendCode, photoURLStr, now, now
      );
      return Response.json({ uid, displayName: trimmedName, friendCode, photoURL: photoURLStr });
    }

    // GET /friends/:uid — フォロー中一覧
    const matchFriendsGet = url.pathname.match(/^\/friends\/(.+)$/);
    if (matchFriendsGet && request.method === "GET") {
      const ownerUid = matchFriendsGet[1];
      const rows = this.db.exec(
        `SELECT u.uid, u.display_name, u.friend_code, u.photo_url
         FROM friends f
         JOIN users u ON u.uid = f.friend_uid
         WHERE f.owner_uid = ?
         ORDER BY f.created_at DESC`,
        ownerUid
      ).toArray();
      return Response.json(rows.map((r) => ({
        uid: r.uid,
        displayName: r.display_name,
        friendCode: r.friend_code,
        photoURL: r.photo_url,
      })));
    }

    // GET /followers/:uid — フォロワー一覧（自分もフォローしているか isFollowing フラグ付き）
    const matchFollowers = url.pathname.match(/^\/followers\/(.+)$/);
    if (matchFollowers && request.method === "GET") {
      const myUid = matchFollowers[1];
      const rows = this.db.exec(
        `SELECT u.uid, u.display_name, u.friend_code, u.photo_url,
                CASE WHEN f2.friend_uid IS NOT NULL THEN 1 ELSE 0 END AS is_following
         FROM friends f
         JOIN users u ON u.uid = f.owner_uid
         LEFT JOIN friends f2 ON f2.owner_uid = ? AND f2.friend_uid = f.owner_uid
         WHERE f.friend_uid = ?
         ORDER BY f.created_at DESC`,
        myUid, myUid
      ).toArray();
      return Response.json(rows.map((r) => ({
        uid: r.uid,
        displayName: r.display_name,
        friendCode: r.friend_code,
        photoURL: r.photo_url,
        isFollowing: Boolean(r.is_following),
      })));
    }

    // POST /friends — フレンド追加
    if (url.pathname === "/friends" && request.method === "POST") {
      let body: unknown;
      try { body = await request.json(); } catch {
        return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
      }
      const { ownerUid, friendUid } = body as Record<string, unknown>;
      if (typeof ownerUid !== "string" || typeof friendUid !== "string") {
        return Response.json({ error: "ownerUid, friendUid は必須です" }, { status: 400 });
      }
      if (ownerUid === friendUid) {
        return Response.json({ error: "自分自身をフレンドに追加できません" }, { status: 400 });
      }
      const friendRow = this.db.exec(
        "SELECT uid, display_name, friend_code, photo_url FROM users WHERE uid = ?",
        friendUid
      ).toArray()[0] ?? null;
      if (!friendRow) return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });

      const existing = this.db.exec(
        "SELECT 1 FROM friends WHERE owner_uid = ? AND friend_uid = ?",
        ownerUid, friendUid
      ).toArray()[0] ?? null;
      if (existing) return Response.json({ error: "すでにフレンドです" }, { status: 409 });

      this.db.exec(
        "INSERT INTO friends (owner_uid, friend_uid, created_at) VALUES (?, ?, ?)",
        ownerUid, friendUid, Date.now()
      );
      return Response.json({
        uid: friendRow.uid,
        displayName: friendRow.display_name,
        friendCode: friendRow.friend_code,
        photoURL: friendRow.photo_url,
      });
    }

    // DELETE /friends/:ownerUid/:friendUid — フレンド削除
    const matchFriendsDelete = url.pathname.match(/^\/friends\/([^/]+)\/([^/]+)$/);
    if (matchFriendsDelete && request.method === "DELETE") {
      const ownerUid = matchFriendsDelete[1];
      const friendUid = matchFriendsDelete[2];
      this.db.exec(
        "DELETE FROM friends WHERE owner_uid = ? AND friend_uid = ?",
        ownerUid, friendUid
      );
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
}
