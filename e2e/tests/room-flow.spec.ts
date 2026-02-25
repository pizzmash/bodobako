import { expect, test, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// ルーム作成・参加・退出フローテスト（2タブ使用）
// -------------------------------------------------------------------------

/** 名前を設定してロビーを表示する */
async function setupPlayer(page: Page, name: string) {
  await page.goto("/");
  // 既に名前が設定されていなければ設定する
  const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);
    await page.getByRole("button", { name: "ゲームを始める" }).click();
    await expect(nameInput).not.toBeVisible();
  }
}

test.describe("ルーム作成・参加フロー", () => {
  test("ルームを作成すると /room/:code に遷移する", async ({ page }) => {
    await setupPlayer(page, "Alice");

    await page.getByLabel("オセロのルームを作成").click();

    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  });

  test("ルームコードで別タブから参加できる", async ({ browser }) => {
    // タブ A でルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("オセロのルームを作成").click({ force: true });
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    // タブ B でルームに参加
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");

    const codeInput = pageB.getByRole("textbox", { name: "ルームコード入力" });
    await codeInput.fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click({ force: true });

    // タブ B が /room/:code に遷移する
    await expect(pageB).toHaveURL(`/room/${code}`);

    // タブ A でも Bob が表示される
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("退出ボタンでロビーに戻る", async ({ page }) => {
    await setupPlayer(page, "Alice");
    await page.getByLabel("オセロのルームを作成").click();
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    // 退出ボタンをクリック
    const leaveBtn = page.getByRole("button", { name: "退出する" });
    await expect(leaveBtn).toBeVisible({ timeout: 10_000 });
    await leaveBtn.click();

    // ロビーに戻る
    await expect(page).toHaveURL("/");
  });

  test("招待ボタンはホストの待機室でのみ表示される", async ({ browser }) => {
    // タブ A（ホスト）
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("オセロのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    // E2Eでは未ログイン状態のためホストでも表示されない
    await expect(pageA.getByRole("button", { name: "フレンドを招待" })).toHaveCount(0);

    // タブ B（参加者）
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageB).toHaveURL(`/room/${code}`);

    // 参加者側には招待ボタンが表示されない
    await expect(pageB.getByRole("button", { name: "フレンドを招待" })).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });

  test("ヘッダーに参加者アイコンが表示され、クリックで参加者情報が開く", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("オセロのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageB).toHaveURL(`/room/${code}`);

    await expect(pageA.getByRole("button", { name: "Alice の情報を表示" })).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Bob の情報を表示" })).toBeVisible();

    await pageA.getByRole("button", { name: "Bob の情報を表示" }).click({ force: true });
    await expect(pageA).toHaveURL(`/room/${code}`);

    await contextA.close();
    await contextB.close();
  });
});

test.describe("ルームページ - 直接アクセス", () => {
  test("/room/:code に直接アクセスして参加できる", async ({ page }) => {
    // まずルームを API で作成する
    const sessionToken = crypto.randomUUID();
    const res = await page.request.post("http://localhost:8787/rooms", {
      data: { playerName: "Alice", gameId: "othello", sessionToken },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBe(true);
    const { code } = await res.json();

    // Bob として /room/:code に直接アクセス
    await page.goto(`/room/${code}`);

    // 名前を設定する（/room/:code では Lobby + RoomPage 両方が NameEntryModal を表示するため last() で選択）
    // RoomPage の NameEntryModal が後から DOM に追加され、z-index: 950 で最前面に表示される
    const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" }).last();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Bob");
      await page.getByRole("button", { name: "ゲームを始める" }).last().click();
      await expect(nameInput).not.toBeVisible();
    }

    // ルームページが表示される（ルームコードが URL にある）
    await expect(page).toHaveURL(`/room/${code}`);
  });
});
