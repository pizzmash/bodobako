import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// オセロゲームフロー（2タブ使用）
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
    // 名前が既にlocalStorageに設定済み、またはモーダルが表示されていない
  }
}

/** 2人のプレイヤーでオセロゲームを開始し、ページとコンテキストを返す */
async function startOthelloGame(browser: {
  newContext: () => Promise<BrowserContext>;
}) {
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
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();
  await expect(pageA.getByRole("heading", { name: "オセロ" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(pageB.getByRole("heading", { name: "オセロ" })).toBeVisible({
    timeout: 10_000,
  });

  return { pageA, pageB, contextA, contextB };
}

/**
 * 手番のプレイヤーのページで1手打つ（または パスする）。
 * ゲーム終了済みの場合は false を返す。
 */
async function playOneMove(pageA: Page, pageB: Page): Promise<boolean> {
  // ゲーム結果カードが出ていたら終了
  const resultA = pageA.getByRole("button", { name: "ロビーに戻る" });
  const resultB = pageB.getByRole("button", { name: "ロビーに戻る" });
  if (
    (await resultA.isVisible().catch(() => false)) ||
    (await resultB.isVisible().catch(() => false))
  ) {
    return false;
  }

  for (const page of [pageA, pageB]) {
    // パスボタンがあればクリック
    const passBtn = page.getByRole("button", {
      name: "パス（置ける場所がありません）",
    });
    if (await passBtn.isVisible().catch(() => false)) {
      await passBtn.click();
      return true;
    }

    // 有効なセルがあればクリック
    const validCell = page.locator("[data-valid='true']").first();
    if (await validCell.isVisible().catch(() => false)) {
      await validCell.click();
      return true;
    }
  }

  return false;
}

test.describe("オセロゲーム", () => {
  test("2人でゲームを開始できる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startOthelloGame(browser);

    // 両タブにオセロ盤が表示されていることは startOthelloGame で確認済み
    // 初期盤面の石数を確認（黒2, 白2）
    await expect(pageA.getByText("黒: 2 / 白: 2")).toBeVisible();
    await expect(pageB.getByText("黒: 2 / 白: 2")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("ゲーム開始後に手を打てる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startOthelloGame(browser);

    // 手番プレイヤーのページで有効なセルをクリック
    const played = await playOneMove(pageA, pageB);
    expect(played).toBe(true);

    // 石数が変化したことを確認（初期 2+2=4 から増加）
    await expect(
      pageA.getByText("黒: 2 / 白: 2")
    ).not.toBeVisible({ timeout: 5_000 });

    await contextA.close();
    await contextB.close();
  });

  test("ゲームを最後まで完走し結果が表示される", async ({ browser }) => {
    test.setTimeout(120_000);

    const { pageA, pageB, contextA, contextB } =
      await startOthelloGame(browser);

    // 最大60手 + パスでゲーム終了まで打ち続ける
    for (let i = 0; i < 80; i++) {
      const continued = await playOneMove(pageA, pageB);
      if (!continued) break;
      // 手の反映を少し待つ
      await pageA.waitForTimeout(300);
    }

    // ゲーム結果カード（GameResultCard）が両方のタブに表示される
    const lobbyBtnA = pageA.getByRole("button", { name: "ロビーに戻る" });
    const lobbyBtnB = pageB.getByRole("button", { name: "ロビーに戻る" });
    await expect(lobbyBtnA).toBeVisible({ timeout: 15_000 });
    await expect(lobbyBtnB).toBeVisible({ timeout: 15_000 });

    // 結果テキストが表示される
    await expect(
      pageA.getByText(/の勝ちです|あなたの勝ちです|引き分けです/)
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      pageB.getByText(/の勝ちです|あなたの勝ちです|引き分けです/)
    ).toBeVisible({ timeout: 5_000 });

    // 「ロビーに戻る」をクリックするとロビーに戻る
    await lobbyBtnA.click();
    await expect(pageA).toHaveURL("/", { timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("複数手を交互に打てる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startOthelloGame(browser);

    // 3手打つ
    for (let i = 0; i < 3; i++) {
      const played = await playOneMove(pageA, pageB);
      expect(played).toBe(true);
      await pageA.waitForTimeout(300);
    }

    // 石数が増えている（初期4個 → 少なくとも7個）
    // 各手で1個置いて1個以上ひっくり返すので、純増は1個ずつ
    const countText = await pageA.getByText(/黒: \d+ \/ 白: \d+/).textContent();
    const match = countText?.match(/黒: (\d+) \/ 白: (\d+)/);
    const total = Number(match?.[1]) + Number(match?.[2]);
    expect(total).toBeGreaterThanOrEqual(7);

    await contextA.close();
    await contextB.close();
  });
});
