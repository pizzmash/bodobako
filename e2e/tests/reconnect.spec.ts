import { expect, test, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// 再接続テスト
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

test.describe("再接続", () => {
  test("ページリロード後もルームに留まる（待機室）", async ({ page }) => {
    await setupPlayer(page, "Alice");
    await page.getByLabel("あいうえバトルのルームを作成").click();

    // ルームページへの遷移を待つ
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/, { timeout: 15_000 });
    const url = page.url();

    // ページをリロード
    await page.reload();

    // 同じルームページに留まっている（sessionToken で再接続）
    await expect(page).toHaveURL(url, { timeout: 15_000 });

    // ルームの待機室または接続中の表示がある
    // （ページが crash せず、ロビーにリダイレクトされていない）
    await expect(page.getByRole("button", { name: "退出する" })).toBeVisible({ timeout: 15_000 });
  });

  test("ゲーム中にページをリロードしてもゲームに復帰できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("あいうえバトルのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/, { timeout: 15_000 });
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    // タブ B: Bob が参加
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    // Alice がゲームを開始
    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await expect(pageA.getByRole("heading", { name: /バトル/ })).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByRole("heading", { name: /バトル/ })).toBeVisible({ timeout: 10_000 });

    // Alice（タブ A）がリロード
    await pageA.reload();

    // リロード後、同じルームページに留まっている
    await expect(pageA).toHaveURL(`/room/${code}`, { timeout: 15_000 });

    // ゲームボードが復帰している（「ゲーム状態を読み込み中...」でフリーズしていない）
    await expect(pageA.getByRole("heading", { name: /バトル/ })).toBeVisible({ timeout: 15_000 });

    // タブ B（Bob）もリロードしてゲームに復帰できる
    await pageB.reload();
    await expect(pageB).toHaveURL(`/room/${code}`, { timeout: 15_000 });
    await expect(pageB.getByRole("heading", { name: /バトル/ })).toBeVisible({ timeout: 15_000 });

    await contextA.close();
    await contextB.close();
  });
});
