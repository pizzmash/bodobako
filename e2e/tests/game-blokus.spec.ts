import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// ブロックスゲームフロー（2タブ使用）
// -------------------------------------------------------------------------

async function setupPlayer(page: Page, name: string) {
  await page.goto("/");
  const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
  try {
    await nameInput.waitFor({ state: "visible", timeout: 8000 });
    await nameInput.fill(name);
    await page.getByRole("button", { name: "ゲームを始める" }).click();
    await expect(nameInput).not.toBeVisible();
  } catch {
    // 名前が既にlocalStorageに設定済み
  }
}

/** 2人のプレイヤーでブロックスゲームを開始し、ページとコンテキストを返す */
async function startBlokusGame(browser: {
  newContext: () => Promise<BrowserContext>;
}) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("ブロックス");
  await pageA.getByLabel("ブロックスのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();
  await expect(pageA.locator(".blk-main-board")).toBeVisible({
    timeout: 10_000,
  });
  await expect(pageB.locator(".blk-main-board")).toBeVisible({
    timeout: 10_000,
  });

  return { pageA, pageB, contextA, contextB };
}

test.describe("ブロックスゲーム", () => {
  test("2人でゲームを開始するとブロックスボードが表示される", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("ブロックス");
  await pageA.getByLabel("ブロックスのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB
      .getByRole("textbox", { name: "ルームコード入力" })
      .fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageB).toHaveURL(`/room/${code}`);

    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // 両タブでブロックスボードが表示される
    await expect(pageA.locator(".blk-main-board")).toBeVisible({
      timeout: 10_000,
    });
    await expect(pageB.locator(".blk-main-board")).toBeVisible({
      timeout: 10_000,
    });

    await contextA.close();
    await contextB.close();
  });

  test("ピースパレットにピースが表示される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusGame(browser);

    // 2人戦では各プレイヤーが2色担当するので、パレットにピースが表示される
    // 21個 × 2色 = 42個のパレットアイテムが手番プレイヤーに表示される
    for (const page of [pageA, pageB]) {
      const paletteItems = page.locator(".blk-palette-item");
      // 2色分のピースが表示されるはず（21 × 2 = 42）
      await expect(paletteItems.first()).toBeVisible({ timeout: 10_000 });
      const count = await paletteItems.count();
      expect(count).toBe(42);
    }

    await contextA.close();
    await contextB.close();
  });

  test("ピースを選択してボードに配置できる（初手は角から）", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusGame(browser);

    // 手番プレイヤーを特定（"▶ 手番" バッジが表示されている方）
    const turnBadgeA = pageA.getByText("▶ 手番");
    const isATurn = await turnBadgeA.isVisible().catch(() => false);
    const currentPage = isATurn ? pageA : pageB;

    // ピース0（1マスピース）を選択
    const paletteItems = currentPage.locator(".blk-palette-item");
    await paletteItems.first().click();

    // 選択状態になることを確認
    await expect(
      currentPage.locator(".blk-palette-item.blk-palette-selected"),
    ).toBeVisible();

    // 有効な配置先（blk-cell-valid）が表示される
    const validCells = currentPage.locator(".blk-cell-valid");
    await expect(validCells.first()).toBeVisible({ timeout: 5_000 });

    // 有効なセルをクリックして配置
    await validCells.first().click();

    // 配置後、選択状態が解除される
    await expect(
      currentPage.locator(".blk-palette-item.blk-palette-selected"),
    ).not.toBeVisible();

    // 直近配置されたピースのハイライトが表示される
    await expect(currentPage.locator(".blk-cell-last-piece").first()).toBeVisible({
      timeout: 5_000,
    });

    await contextA.close();
    await contextB.close();
  });

  test("複数手を交互に打てる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusGame(browser);

    // 2人戦は4色を交互に打つ（青→黄→赤→緑→…）
    // 最初の4手（各色1手ずつ）を打つ
    for (let turn = 0; turn < 4; turn++) {
      // 両ページの状態が揃ってから判定する
      // ▶手番バッジはいずれか一方のページにのみ表示される（XOR条件）ので、
      // 両ページが同じ状態になるまでリトライする
      let isATurn = false;
      await expect(async () => {
        const aHasTurn = await pageA.getByText("▶ 手番").isVisible().catch(() => false);
        const bHasTurn = await pageB.getByText("▶ 手番").isVisible().catch(() => false);
        expect(aHasTurn !== bHasTurn).toBe(true); // XOR: 必ずどちらか一方のみ
        isATurn = aHasTurn;
      }).toPass({ timeout: 10_000 });
      const currentPage = isATurn ? pageA : pageB;

      // ピースパレットから最初の有効なピースを選択
      const enabledItems = currentPage.locator(
        ".blk-palette-item:not([disabled])",
      );
      await expect(enabledItems.first()).toBeEnabled({ timeout: 5_000 });
      await enabledItems.first().click();

      // 有効な配置先が表示されるのを待つ
      const validCells = currentPage.locator(".blk-cell-valid");
      await expect(validCells.first()).toBeVisible({ timeout: 5_000 });

      // 配置
      await validCells.first().click();

      // 配置後、両ページでラストムーブハイライトが表示されるのを待つ
      // これにより次の手番の判定前に両ページの状態が揃う
      await expect(pageA.locator(".blk-cell-last-piece").first()).toBeVisible({ timeout: 5_000 });
      await expect(pageB.locator(".blk-cell-last-piece").first()).toBeVisible({ timeout: 5_000 });
    }

    await contextA.close();
    await contextB.close();
  });
});
