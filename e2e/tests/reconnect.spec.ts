import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// 再接続テスト
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

test.describe("再接続", () => {
  test("ページリロード後もルームに留まる", async ({ page }) => {
    await setupPlayer(page, "Alice");
    await page.getByLabel("オセロのルームを作成").click();

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
});
