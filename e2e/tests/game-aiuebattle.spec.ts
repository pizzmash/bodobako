import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// あいうえバトルゲームフロー（2タブ使用）
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

test.describe("あいうえバトル", () => {
  test("2人でゲームを開始し、お題選択フェーズに遷移できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
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
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
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
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
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

  test("削除ボタンで入力した文字を1文字ずつ消せる", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
  await pageA.getByLabel("あいうえバトルのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible()) ? pageA : pageB;
    await selectorPage.locator(".ab-topic-btn").first().click();

    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    const deleteBtn = pageA.getByRole("button", { name: "削除" });

    // 初期状態: 削除ボタンは無効（0文字）
    await expect(deleteBtn).toBeDisabled();

    // 「あ」を3回入力 → 3文字
    const charBtnA = pageA.locator(".ab-char-btn").filter({ hasText: "あ" });
    await charBtnA.click();
    await charBtnA.click();
    await charBtnA.click();
    await expect(pageA.getByText("3 / 7 文字")).toBeVisible();

    // 削除ボタンが有効になっている
    await expect(deleteBtn).toBeEnabled();

    // 1回削除 → 2文字
    await deleteBtn.click();
    await expect(pageA.getByText("2 / 7 文字")).toBeVisible();

    // もう1回削除 → 1文字
    await deleteBtn.click();
    await expect(pageA.getByText("1 / 7 文字")).toBeVisible();

    // 確認ボタンは2文字未満なので無効
    await expect(pageA.getByRole("button", { name: "確認" })).toBeDisabled();

    // 最後の1文字を削除 → 0文字、削除ボタンも無効に
    await deleteBtn.click();
    await expect(pageA.getByText("0 / 7 文字")).toBeVisible();
    await expect(deleteBtn).toBeDisabled();

    await contextA.close();
    await contextB.close();
  });

  test("7文字入力すると文字ボタンが無効化される", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
  await pageA.getByLabel("あいうえバトルのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible()) ? pageA : pageB;
    await selectorPage.locator(".ab-topic-btn").first().click();

    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    // 「あ」を7回クリックして最大文字数まで入力
    const charBtnA = pageA.locator(".ab-char-btn").filter({ hasText: "あ" });
    for (let i = 0; i < 7; i++) {
      await charBtnA.click();
    }
    await expect(pageA.getByText("7 / 7 文字")).toBeVisible();

    // 文字ボタンがすべて disabled になっている
    await expect(charBtnA).toBeDisabled();
    // 別の文字ボタンも disabled
    await expect(pageA.locator(".ab-char-btn").filter({ hasText: "か" })).toBeDisabled();

    // 確認ボタンは有効
    await expect(pageA.getByRole("button", { name: "確認" })).toBeEnabled();

    // 削除して6文字に戻すと文字ボタンが再び有効になる
    await pageA.getByRole("button", { name: "削除" }).click();
    await expect(pageA.getByText("6 / 7 文字")).toBeVisible();
    await expect(charBtnA).toBeEnabled();

    await contextA.close();
    await contextB.close();
  });

  test("確認モーダルで「戻る」を押すと入力画面に戻れる", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("あいうえバトル");
  await pageA.getByLabel("あいうえバトルのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await Promise.race([
      pageA.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
      pageB.getByText("お題を選んでください").waitFor({ state: "visible", timeout: 10_000 }),
    ]);
    const selectorPage = (await pageA.getByText("お題を選んでください").isVisible()) ? pageA : pageB;
    await selectorPage.locator(".ab-topic-btn").first().click();

    await expect(pageA.getByText("2〜7文字の言葉を入力してください")).toBeVisible({ timeout: 10_000 });

    // 「あ」を2文字入力して確認ボタンを押す
    const charBtnA = pageA.locator(".ab-char-btn").filter({ hasText: "あ" });
    await charBtnA.click();
    await charBtnA.click();
    await pageA.getByRole("button", { name: "確認" }).click();

    // 確認モーダルが表示される
    await expect(pageA.getByText("この回答でよろしいですか？")).toBeVisible();
    await expect(pageA.getByRole("button", { name: "決定" })).toBeVisible();
    await expect(pageA.getByRole("button", { name: "戻る" })).toBeVisible();

    // 「戻る」を押すとモーダルが閉じ、入力画面に戻る
    await pageA.getByRole("button", { name: "戻る" }).click();
    await expect(pageA.getByText("この回答でよろしいですか？")).not.toBeVisible();

    // 入力状態が維持されている（2文字のまま）
    await expect(pageA.getByText("2 / 7 文字")).toBeVisible();

    // 引き続き文字を追加して再度確認→決定できる
    await charBtnA.click();
    await expect(pageA.getByText("3 / 7 文字")).toBeVisible();
    await pageA.getByRole("button", { name: "確認" }).click();
    await expect(pageA.getByText("この回答でよろしいですか？")).toBeVisible();
    await pageA.getByRole("button", { name: "決定" }).click();

    // 送信後は待機画面に遷移
    await expect(pageA.getByText("他のプレイヤーを待っています")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });
});
