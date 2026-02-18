/**
 * RoomRegistry - ルームコードのグローバル管理 (SQLite-backed Durable Object)
 *
 * KVの代替として、single-instanceのDurable ObjectでSQLiteを使いルームコードを管理する。
 * Worker から `env.REGISTRY.idFromName("global")` でアクセスする。
 */

export class RoomRegistry implements DurableObject {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          code TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL
        )
      `);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // GET /rooms - 全ルームコード一覧
    if (request.method === "GET" && path === "/rooms") {
      const rows = this.ctx.storage.sql.exec("SELECT code FROM rooms").toArray();
      return Response.json(rows.map((r) => r.code as string));
    }

    // POST /rooms - ルームコードを登録
    if (request.method === "POST" && path === "/rooms") {
      const { code } = await request.json<{ code: string }>();
      try {
        this.ctx.storage.sql.exec(
          "INSERT INTO rooms (code, created_at) VALUES (?, ?)",
          code,
          Date.now()
        );
        return Response.json({ ok: true });
      } catch {
        return Response.json({ error: "コードは既に使用されています" }, { status: 409 });
      }
    }

    // GET /rooms/:code - 存在確認
    if (request.method === "GET" && path.startsWith("/rooms/")) {
      const code = path.slice(7);
      const rows = this.ctx.storage.sql
        .exec("SELECT code FROM rooms WHERE code = ?", code)
        .toArray();
      if (rows.length === 0) return Response.json({ error: "not found" }, { status: 404 });
      return Response.json({ ok: true });
    }

    // DELETE /rooms/:code - ルームコードを削除
    if (request.method === "DELETE" && path.startsWith("/rooms/")) {
      const code = path.slice(7);
      this.ctx.storage.sql.exec("DELETE FROM rooms WHERE code = ?", code);
      return Response.json({ ok: true });
    }

    return new Response("Not Found", { status: 404 });
  }
}
