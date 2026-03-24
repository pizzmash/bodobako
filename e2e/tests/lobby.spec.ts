import { test, expect } from "@playwright/test";

// -------------------------------------------------------------------------
// ロビー基本操作テスト
// -------------------------------------------------------------------------

test.describe("ロビー - 名前入力モーダル", () => {
  test("名前未入力ではゲームを始めるボタンが無効", async ({ page }) => {
    await page.goto("/");

    // NameEntryModal が表示されている
    const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
    await expect(nameInput).toBeVisible();

    // OK ボタンが無効状態
    const okBtn = page.getByRole("button", { name: "ゲームを始める" });
    await expect(okBtn).toBeDisabled();
  });

  test("名前入力後にゲームを始めるボタンが有効になる", async ({ page }) => {
    await page.goto("/");

    const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
    await nameInput.fill("Alice");

    const okBtn = page.getByRole("button", { name: "ゲームを始める" });
    await expect(okBtn).toBeEnabled();
  });

  test("名前を設定すると localStorage に保存される", async ({ page }) => {
    await page.goto("/");

    const nameInput = page.getByRole("textbox", { name: "プレイヤー名入力" });
    await nameInput.fill("Alice");
    await page.getByRole("button", { name: "ゲームを始める" }).click();

    const stored = await page.evaluate(() => localStorage.getItem("bodobako:playerName"));
    expect(stored).toBe("Alice");
  });

  test("名前設定後はモーダルが閉じてロビーが表示される", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("textbox", { name: "プレイヤー名入力" }).fill("Alice");
    await page.getByRole("button", { name: "ゲームを始める" }).click();

    // モーダルが閉じている（名前入力フィールドが消える）
    await expect(page.getByRole("textbox", { name: "プレイヤー名入力" })).not.toBeVisible();

    // ゲーム一覧が表示されている
    await expect(page.getByLabel("あいうえバトルのルームを作成")).toBeVisible();
  });
});

test.describe("ロビー - ゲーム一覧", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 名前を設定してモーダルを閉じる
    await page.getByRole("textbox", { name: "プレイヤー名入力" }).fill("Alice");
    await page.getByRole("button", { name: "ゲームを始める" }).click();
    // モーダルが閉じるのを待つ
    await expect(page.getByRole("textbox", { name: "プレイヤー名入力" })).not.toBeVisible();
  });

  test("ゲーム一覧に複数ゲームが表示される", async ({ page }) => {
    // 実装済みゲームの確認
    await expect(page.getByLabel("あいうえバトルのルームを作成")).toBeVisible();
    await expect(page.getByLabel("シティチェイスのルームを作成")).toBeVisible();
    await expect(page.getByLabel("音速飯点のルームを作成")).toBeVisible();
    await expect(page.getByLabel("ナナのルームを作成")).toBeVisible();
  });

  test("ルーム作成ボタンをクリックするとルームページに遷移する", async ({ page }) => {
    await page.getByLabel("あいうえバトルのルームを作成").click();

    // /room/:code に遷移する
    await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  });

  test("ルームコードを入力して参加ボタンをクリックできる", async ({ page }) => {
    const codeInput = page.getByRole("textbox", { name: "ルームコード入力" });
    await expect(codeInput).toBeVisible();

    const joinBtn = page.getByRole("button", { name: "ルームに参加" });
    await expect(joinBtn).toBeVisible();
  });
});

test.describe("ロビー - localStorage からの復元", () => {
  test("localStorageに名前があれば直接ロビーが表示される", async ({ page }) => {
    // localStorageを事前に設定
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("bodobako:playerName", "Bob"));
    await page.reload();

    // モーダルが表示されない
    await expect(page.getByRole("textbox", { name: "プレイヤー名入力" })).not.toBeVisible();

    // ゲーム一覧が表示される
    await expect(page.getByLabel("あいうえバトルのルームを作成")).toBeVisible();
  });
});
