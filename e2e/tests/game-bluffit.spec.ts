import { expect, test } from "@playwright/test";

test("ブラフィットをPCとスマホで開始し、再接続・一騎打ち・最終戦・再戦まで同期する", async ({
  browser,
}, info) => {
  test.setTimeout(120_000);
  const host = await browser.newPage();
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pages = [host, guest];
  for (const [i, p] of pages.entries()) {
    await p.goto("/");
    await p.getByRole("textbox", { name: "プレイヤー名入力" }).fill(i ? "Guest" : "Host");
    await p.getByRole("button", { name: "ゲームを始める" }).click();
  }
  await host.getByRole("searchbox", { name: "ゲーム検索" }).fill("ブラフィット");
  await host.getByLabel("ブラフィットのルームを作成").click();
  await expect(host).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  await guest.getByRole("textbox", { name: "ルームコード入力" }).fill(host.url().slice(-4));
  await guest.getByRole("button", { name: "ルームに参加" }).click();
  await host.getByRole("button", { name: "ゲーム開始" }).click();

  for (let round = 1; round <= 11; round++) {
    for (const p of pages) {
      await expect(
        p.getByRole("heading", {
          name: round === 11 ? "最終ラウンド" : `ラウンド ${round}`,
          exact: true,
        }),
      ).toBeVisible();
      await p
        .getByRole("button", { name: /指し値 .* を選ぶ/ })
        .first()
        .click();
      if (round === 1) {
        await info.attach(p === host ? "desktop-table" : "mobile-table", {
          body: await p.screenshot(),
          contentType: "image/png",
        });
      }
      await p.getByRole("button", { name: /を伏せる/ }).click();
      if (round === 1 && p === host) {
        await expect(host.locator(".bf-secret")).toContainText("1");
        await host.reload();
        await expect(host.locator(".bf-secret")).toContainText("1");
      }
    }
    await expect(host.locator(".bf-phase")).toContainText("争奪戦");
    await expect(guest.locator(".bf-phase")).toContainText("争奪戦");
    const first = (await host.locator(".bf-market button").first().isEnabled()) ? host : guest;
    const second = first === host ? guest : host;
    await first.locator(".bf-market button").first().click();
    if (round === 1) await second.locator(".bf-seats button:enabled").click();
    else await second.locator(".bf-market button").first().click();
  }
  for (const p of pages) await expect(p.getByRole("heading", { name: "最終得点" })).toBeVisible();
  await guest.getByLabel("再戦を希望する").click();
  await host.getByLabel("再戦する").click();
  await host.getByRole("button", { name: "このメンバーで再戦" }).click();
  for (const p of pages)
    await expect(p.getByRole("button", { name: /指し値 .* を選ぶ/ })).toHaveCount(10);
});
