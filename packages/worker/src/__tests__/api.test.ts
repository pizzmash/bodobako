import { describe, it, expect, beforeAll } from "vitest";
import { SELF } from "cloudflare:test";

// -------------------------------------------------------------------------
// HTTP API テスト - POST /rooms, GET /rooms/:code/ws
// -------------------------------------------------------------------------
//
// @cloudflare/vitest-pool-workers が提供する SELF binding を使って
// Workers ランタイムで実際のリクエストを送信しテストする。

describe("POST /rooms", () => {
  it("正常: ルームを作成して code と playerId を返す", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Alice",
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json<{ code: string; playerId: string }>();
    expect(typeof json.code).toBe("string");
    expect(json.code).toHaveLength(4);
    expect(typeof json.playerId).toBe("string");
  });

  it("異常: playerName が空文字 → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "",
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json<{ error: string }>();
    expect(json.error).toMatch(/playerName/);
  });

  it("異常: playerName が21文字以上 → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "A".repeat(21),
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(400);
  });

  it("異常: 存在しない gameId → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Alice",
        gameId: "nonexistent-game",
        sessionToken: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json<{ error: string }>();
    expect(json.error).toMatch(/不明なゲームID/);
  });

  it("異常: sessionToken が未指定 → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Alice",
        gameId: "othello",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("異常: リクエストボディが JSON でない → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    expect(res.status).toBe(400);
  });

  it("異常: playerName が空白のみ → 400", async () => {
    const res = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "   ",
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json<{ error: string }>();
    expect(json.error).toMatch(/playerName/);
  });
});

describe("GET /rooms/:code/ws", () => {
  it("異常: 存在しないコード → 404", async () => {
    const res = await SELF.fetch("http://example.com/rooms/ZZZZ/ws", {
      headers: {
        Upgrade: "websocket",
        Connection: "upgrade",
      },
    });

    expect(res.status).toBe(404);
  });

  it("正常: 存在するコードで WebSocket アップグレードが成功する", async () => {
    // まずルームを作成
    const createRes = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Alice",
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });
    const { code } = await createRes.json<{ code: string }>();

    // WebSocket アップグレードを試みる
    const wsRes = await SELF.fetch(`http://example.com/rooms/${code}/ws`, {
      headers: {
        Upgrade: "websocket",
        Connection: "upgrade",
      },
    });

    // Workers ランタイムでは 101 Switching Protocols が返る
    expect(wsRes.status).toBe(101);
  });

  it("異常: Upgrade ヘッダなし → 426", async () => {
    // まずルームを作成
    const createRes = await SELF.fetch("http://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Alice",
        gameId: "othello",
        sessionToken: crypto.randomUUID(),
      }),
    });
    const { code } = await createRes.json<{ code: string }>();

    // Upgrade ヘッダなしでアクセス
    const res = await SELF.fetch(`http://example.com/rooms/${code}/ws`);

    expect(res.status).toBe(426);
  });
});
