import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// 音速飯店ゲームフロー（2タブ使用）
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

test.describe("音速飯店", () => {
  test("2人でゲームを開始するとカウントダウンが表示される", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("音速飯点のルームを作成").click();
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

    // Alice がゲームを開始
    const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // カウントダウン（3, 2, 1 のいずれか）が両タブで表示される
    await expect(pageA.locator(".countdown-number")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.locator(".countdown-number")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("カウントダウン後に手札エリアが表示される", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("音速飯点のルームを作成").click();
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

    // カウントダウンが終わると「自分の手札」ラベルが表示される
    // カウントダウンは最大約6秒かかるため、余裕を持って15秒待つ
    await expect(pageA.getByText("自分の手札")).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByText("自分の手札")).toBeVisible({ timeout: 15_000 });

    // 手札スクロールエリアが表示される
    await expect(pageA.locator(".sr-hand-scroll")).toBeVisible();
    await expect(pageB.locator(".sr-hand-scroll")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
