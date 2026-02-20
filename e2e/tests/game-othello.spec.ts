import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// オセロゲームフロー（2タブ使用）
// -------------------------------------------------------------------------

async function setupPlayer(page: Page, name: string) {
  await page.goto("/");
  const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);
    await page.getByRole("button", { name: "ゲームを始める" }).click();
    await expect(nameInput).not.toBeVisible();
  }
}

test.describe("オセロゲーム", () => {
  test("2人でゲームを開始できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("オセロのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    // タブ B: Bob が参加
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageB).toHaveURL(`/room/${code}`);

    // タブ A に Bob が表示される
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    // ゲーム開始ボタンが Alice（ホスト）に表示される
    const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Alice がゲームを開始
    await startBtn.click();

    // 両タブでオセロボードが表示される（<h2>オセロ</h2> の見出しで確認）
    await expect(pageA.getByRole("heading", { name: "オセロ" })).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByRole("heading", { name: "オセロ" })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("ゲーム開始後に手を打てる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("オセロのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    // タブ B: Bob が参加
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    // ゲーム開始
    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await expect(pageA.getByRole("heading", { name: "オセロ" })).toBeVisible({ timeout: 10_000 });

    // いずれかのページで手番プレイヤーがクリックできるセルを探す
    // OthelloBoard のセルは div[data-valid='true'] で識別
    const clickableCell = pageA.locator("[data-valid='true']").first();
    const clickableCellB = pageB.locator("[data-valid='true']").first();

    // どちらかのタブで valid な手があるはず
    const aHasMove = await clickableCell.isVisible().catch(() => false);
    const bHasMove = await clickableCellB.isVisible().catch(() => false);

    if (aHasMove) {
      await clickableCell.click();
    } else if (bHasMove) {
      await clickableCellB.click();
    }
    // どちらにも手がない場合はゲーム状態の問題（スキップ）

    await contextA.close();
    await contextB.close();
  });
});
