const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode(): string {
  return Array.from({ length: 8 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

export function canInviteWithFriendRelations(
  inviterFollowsInvited: boolean,
  invitedFollowsInviter: boolean,
): boolean {
  return inviterFollowsInvited && invitedFollowsInviter;
}

export class UserRegistry implements DurableObject {
  private state: DurableObjectState;
  private db!: SqlStorage;
  private static readonly INVITE_RETENTION_MS = 1000 * 60 * 60;
  private static readonly INVITE_MAX_PER_USER = 200;

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
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS invites (
          invite_id TEXT PRIMARY KEY,
          invited_uid TEXT NOT NULL,
          inviter_uid TEXT NOT NULL,
          inviter_name TEXT NOT NULL,
          room_code TEXT NOT NULL,
          game_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'unread',
          created_at INTEGER NOT NULL,
          read_at INTEGER
        )
      `);
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_invites_invited_uid_status_created ON invites(invited_uid, status, created_at DESC)");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_invites_created_at ON invites(created_at)");
    });
  }

  private compactInvitesForUser(invitedUid: string, now: number): void {
    const expireBefore = now - UserRegistry.INVITE_RETENTION_MS;

    // 保存期限を過ぎた招待を削除
    this.db.exec(
      "DELETE FROM invites WHERE invited_uid = ? AND created_at < ?",
      invitedUid,
      expireBefore,
    );

    // ユーザーごとに最新N件だけ保持
    this.db.exec(
      `DELETE FROM invites
       WHERE invited_uid = ?
         AND invite_id IN (
           SELECT invite_id FROM invites
           WHERE invited_uid = ?
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`,
      invitedUid,
      invitedUid,
      UserRegistry.INVITE_MAX_PER_USER,
    );
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

    // POST /invites — 招待を一括作成（内部API）
    if (url.pathname === "/invites" && request.method === "POST") {
      let body: unknown;
      try { body = await request.json(); } catch {
        return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
      }
      if (typeof body !== "object" || body === null) {
        return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
      }

      const { inviterUid, inviterName, roomCode, gameId, invitedUids } = body as Record<string, unknown>;
      if (typeof inviterUid !== "string" || !inviterUid) {
        return Response.json({ error: "inviterUid は必須です" }, { status: 400 });
      }
      if (typeof inviterName !== "string" || !inviterName.trim()) {
        return Response.json({ error: "inviterName は必須です" }, { status: 400 });
      }
      if (typeof roomCode !== "string" || !roomCode.trim()) {
        return Response.json({ error: "roomCode は必須です" }, { status: 400 });
      }
      if (typeof gameId !== "string" || !gameId.trim()) {
        return Response.json({ error: "gameId は必須です" }, { status: 400 });
      }
      if (!Array.isArray(invitedUids)) {
        return Response.json({ error: "invitedUids は配列で指定してください" }, { status: 400 });
      }

      const normalizedInvitedUids = Array.from(
        new Set(
          invitedUids
            .filter((uid): uid is string => typeof uid === "string")
            .map((uid) => uid.trim())
            .filter((uid) => uid.length > 0 && uid !== inviterUid)
        )
      ).slice(0, 100);

      let created = 0;
      let skipped = 0;
      const now = Date.now();

      for (const invitedUid of normalizedInvitedUids) {
        // inviter -> invited のフレンド関係
        const forwardRelation = this.db.exec(
          "SELECT 1 FROM friends WHERE owner_uid = ? AND friend_uid = ?",
          inviterUid,
          invitedUid
        ).toArray()[0] ?? null;
        // invited -> inviter のフレンド関係（相互フレンド判定）
        const reverseRelation = this.db.exec(
          "SELECT 1 FROM friends WHERE owner_uid = ? AND friend_uid = ?",
          invitedUid,
          inviterUid
        ).toArray()[0] ?? null;

        const canInvite = canInviteWithFriendRelations(Boolean(forwardRelation), Boolean(reverseRelation));
        if (!canInvite) {
          skipped++;
          continue;
        }

        // 同じルームへの未読招待は最新1件に集約（重複防止）
        this.db.exec(
          `DELETE FROM invites
           WHERE invited_uid = ? AND inviter_uid = ? AND room_code = ? AND status = 'unread'`,
          invitedUid,
          inviterUid,
          roomCode.trim().toUpperCase(),
        );

        const inviteId = crypto.randomUUID();
        this.db.exec(
          `INSERT INTO invites (invite_id, invited_uid, inviter_uid, inviter_name, room_code, game_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'unread', ?)`,
          inviteId,
          invitedUid,
          inviterUid,
          inviterName.trim(),
          roomCode.trim().toUpperCase(),
          gameId.trim(),
          now,
        );

        this.compactInvitesForUser(invitedUid, now);
        created++;
      }

      return Response.json({ created, skipped });
    }

    // GET /invites/:uid — 招待一覧（既定: unread のみ）
    const matchInvitesGet = url.pathname.match(/^\/invites\/([^/]+)$/);
    if (matchInvitesGet && request.method === "GET") {
      const uid = matchInvitesGet[1];
      const status = url.searchParams.get("status") ?? "unread";
      const rows = status === "all"
        ? this.db.exec(
          `SELECT invite_id, invited_uid, inviter_uid, inviter_name, room_code, game_id, status, created_at, read_at
           FROM invites
           WHERE invited_uid = ?
           ORDER BY created_at DESC
           LIMIT 50`,
          uid
        ).toArray()
        : this.db.exec(
          `SELECT invite_id, invited_uid, inviter_uid, inviter_name, room_code, game_id, status, created_at, read_at
           FROM invites
           WHERE invited_uid = ? AND status = 'unread'
           ORDER BY created_at DESC
           LIMIT 50`,
          uid
        ).toArray();

      this.compactInvitesForUser(uid, Date.now());

      return Response.json(rows.map((row) => ({
        inviteId: row.invite_id,
        invitedUid: row.invited_uid,
        inviterUid: row.inviter_uid,
        inviterName: row.inviter_name,
        roomCode: row.room_code,
        gameId: row.game_id,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at ?? null,
      })));
    }

    // POST /invites/:uid/:inviteId/read — 招待既読化
    const matchInviteRead = url.pathname.match(/^\/invites\/([^/]+)\/([^/]+)\/read$/);
    if (matchInviteRead && request.method === "POST") {
      const uid = matchInviteRead[1];
      const inviteId = matchInviteRead[2];
      const now = Date.now();

      this.db.exec(
        `UPDATE invites
         SET status = 'read', read_at = ?
         WHERE invite_id = ? AND invited_uid = ?`,
        now,
        inviteId,
        uid,
      );
      this.compactInvitesForUser(uid, now);
      return Response.json({ ok: true });
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
