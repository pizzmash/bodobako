import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// あいうえバトルゲームフロー（2タブ使用）
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

test.describe("あいうえバトル", () => {
  test("2人でゲームを開始し、お題選択フェーズに遷移できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("あいうえバトルのルームを作成").click();
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

    // 開始時にプレイヤー順がシャッフルされるため、どちらがお題選択者か不定
    // どちらかのページに「お題を選んでください」が表示されるまで待つ
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);

    // 実際の選択者ページを特定
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible()) ? pageA : pageB;
    const waiterPage = selectorPage === pageA ? pageB : pageA;

    // 待機側は "がお題を選んでいます" を表示
    await expect(waiterPage.getByText("がお題を選んでいます")).toBeVisible({ timeout: 5_000 });

    // お題ボタンが存在し、クリックできる
    const topicBtn = selectorPage.locator(".ab-topic-btn").first();
    await expect(topicBtn).toBeVisible();
    await topicBtn.click();

    // 両タブで単語入力フェーズに遷移
    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("試合完了まで全フローを通過できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("あいうえバトルのルームを作成").click();
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

    // お題選択フェーズ
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible())
      ? pageA
      : pageB;
    await selectorPage.locator(".ab-topic-btn").first().click();

    // 単語入力フェーズ
    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    // 両プレイヤーが「あ」を2文字入力して送信
    // 注: BOARD_LAYOUT は BOARD_CHARS と表示順が異なるため .first() は「ー」になる
    //     → filter({ hasText: "あ" }) でボタンを直接指定する
    // 「ああ×××××」を提出。相手も同じなので、バトルで「あ」を1回攻撃するだけで全員同時脱落
    async function submitWordAa(page: Page) {
      const charBtn = page.locator(".ab-char-btn").filter({ hasText: "あ" });
      await charBtn.click();
      await charBtn.click();
      await page.getByRole("button", { name: "確認" }).click();
      await page.getByRole("button", { name: "決定" }).click();
    }

    await Promise.all([submitWordAa(pageA), submitWordAa(pageB)]);

    // バトルフェーズ: 手番プレイヤーを特定して「あ」を1回攻撃
    // → 全員の「ああ」が開示されて同時脱落 → 即ゲーム終了
    await Promise.race([
      pageA.getByText("あなたの番です！").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("あなたの番です！").waitFor({ state: "visible", timeout: 10_000 }),
    ]);
    const attackerPage = (await pageA.getByText("あなたの番です！").isVisible())
      ? pageA
      : pageB;
    // .ab-battle-char は「自分のターン中の未使用ボタン」に付くクラス
    await attackerPage.locator(".ab-battle-char").filter({ hasText: "あ" }).click();

    // 試合結果: 両プレイヤーに GameResultCard（「ロビーに戻る」ボタン）が表示される
    await expect(pageA.getByRole("button", { name: "ロビーに戻る" })).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByRole("button", { name: "ロビーに戻る" })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("単語入力フェーズで文字ボタンをクリックできる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("あいうえバトルのルームを作成").click();
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
    const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).toBeEnabled({ timeout: 10_000 });
    await startBtn.click();

    // 開始時にプレイヤー順がシャッフルされるため、どちらがお題選択者か不定
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);

    // 実際の選択者ページを特定してお題を選択
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible()) ? pageA : pageB;
    await selectorPage.locator(".ab-topic-btn").first().click();

    // 単語入力フェーズに遷移
    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    // 文字ボタンが表示される（Alice のページで確認）
    const charBtns = pageA.locator(".ab-char-btn");
    await expect(charBtns.first()).toBeVisible();

    // 文字ボタンを2回クリック（最低2文字で確認ボタンが有効になる）
    await charBtns.first().click();
    await charBtns.first().click();

    // 確認ボタンが有効になっている
    const confirmBtn = pageA.getByRole("button", { name: "確認" });
    await expect(confirmBtn).toBeEnabled();

    await contextA.close();
    await contextB.close();
  });
});
