import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// チャオチャオゲームフロー（2タブ使用）
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

/** 2人でチャオチャオゲームを開始し、ページとコンテキストを返す */
async function startCiaoCiaoGame(browser: { newContext: () => Promise<BrowserContext> }) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("チャオチャオ");
  await pageA.getByLabel("チャオチャオのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();

  // 両ページのボード表示を待つ（STARTラベルは常に表示）
  await expect(pageA.getByText("START")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("START")).toBeVisible({ timeout: 10_000 });

  return { pageA, pageB, contextA, contextB, code };
}

/** 手番プレイヤーのページを返す。どちらでもなければ null */
async function getTurnPage(pageA: Page, pageB: Page): Promise<Page | null> {
  for (const page of [pageA, pageB]) {
    const visible = await page
      .getByRole("button", { name: "サイコロを振る" })
      .isVisible()
      .catch(() => false);
    if (visible) return page;
  }
  return null;
}

// -------------------------------------------------------------------------

test.describe("チャオチャオゲーム", () => {
  test("2人でゲームを開始するとチャオチャオのボードが表示される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    // 両タブにSTARTが見える（ブリッジ）
    await expect(pageA.getByText("START")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("START")).toBeVisible({ timeout: 10_000 });

    // 両タブにGOALが見える
    await expect(pageA.getByText("GOAL")).toBeVisible();
    await expect(pageB.getByText("GOAL")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("サイコロを振ると宣言フェーズに移行する", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    // 手番プレイヤーのページを取得
    const turnPage = await getTurnPage(pageA, pageB);
    expect(turnPage).not.toBeNull();

    // サイコロを振る
    await turnPage!.getByRole("button", { name: "サイコロを振る" }).click();

    // 宣言パネルが表示される（数字選択ボタン群）
    await expect(turnPage!.getByText("あなたの出目:")).toBeVisible({ timeout: 8_000 });
    await expect(turnPage!.getByRole("button", { name: "「?」と宣言する" })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("数字を宣言するとチャレンジフェーズに移行する", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    const turnPage = await getTurnPage(pageA, pageB);
    const otherPage = turnPage === pageA ? pageB : pageA;
    expect(turnPage).not.toBeNull();

    // サイコロを振る
    await turnPage!.getByRole("button", { name: "サイコロを振る" }).click();
    await expect(turnPage!.getByText("あなたの出目:")).toBeVisible({ timeout: 8_000 });

    // 「1」を選択して宣言
    await turnPage!.getByRole("button", { name: "1" }).first().click();
    await turnPage!.getByRole("button", { name: "「1」と宣言する" }).click();

    // 相手側に「信じる」「ウソだ！」ボタンが表示される
    await expect(otherPage.getByRole("button", { name: "信じる" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(otherPage.getByRole("button", { name: "ウソだ！" })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("「信じる」を押すと次のターンに進む", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    // 1ターン目を「信じる」で完了させる
    const turnPage = await getTurnPage(pageA, pageB);
    const otherPage = turnPage === pageA ? pageB : pageA;
    expect(turnPage).not.toBeNull();

    await turnPage!.getByRole("button", { name: "サイコロを振る" }).click();
    await expect(turnPage!.getByText("あなたの出目:")).toBeVisible({ timeout: 8_000 });
    await turnPage!.getByRole("button", { name: "1" }).first().click();
    await turnPage!.getByRole("button", { name: "「1」と宣言する" }).click();

    // 相手が「信じる」
    await expect(otherPage.getByRole("button", { name: "信じる" })).toBeVisible({
      timeout: 10_000,
    });
    await otherPage.getByRole("button", { name: "信じる" }).click();

    // どちらかのページで「サイコロを振る」が再び表示される（次のターン）
    await expect(async () => {
      const aVisible = await pageA.getByRole("button", { name: "サイコロを振る" }).isVisible().catch(() => false);
      const bVisible = await pageB.getByRole("button", { name: "サイコロを振る" }).isVisible().catch(() => false);
      expect(aVisible || bVisible).toBe(true);
    }).toPass({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("「ウソだ！」を押すと結果が公開される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    const turnPage = await getTurnPage(pageA, pageB);
    const otherPage = turnPage === pageA ? pageB : pageA;
    expect(turnPage).not.toBeNull();

    // 宣言まで進める
    await turnPage!.getByRole("button", { name: "サイコロを振る" }).click();
    await expect(turnPage!.getByText("あなたの出目:")).toBeVisible({ timeout: 8_000 });
    await turnPage!.getByRole("button", { name: "2" }).first().click();
    await turnPage!.getByRole("button", { name: "「2」と宣言する" }).click();

    // 相手が「ウソだ！」
    await expect(otherPage.getByRole("button", { name: "ウソだ！" })).toBeVisible({
      timeout: 10_000,
    });
    await otherPage.getByRole("button", { name: "ウソだ！" }).click();

    // RevealOverlay が表示される：宣言者（turnPage）に OK ボタンが表示される
    await expect(turnPage!.getByRole("button", { name: "OK" })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("RevealOverlay で OK を押すと次のターンに進む", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startCiaoCiaoGame(browser);

    const turnPage = await getTurnPage(pageA, pageB);
    const otherPage = turnPage === pageA ? pageB : pageA;
    expect(turnPage).not.toBeNull();

    // 宣言 → ウソだ！ → reveal
    await turnPage!.getByRole("button", { name: "サイコロを振る" }).click();
    await expect(turnPage!.getByText("あなたの出目:")).toBeVisible({ timeout: 8_000 });
    await turnPage!.getByRole("button", { name: "3" }).first().click();
    await turnPage!.getByRole("button", { name: "「3」と宣言する" }).click();
    await expect(otherPage.getByRole("button", { name: "ウソだ！" })).toBeVisible({ timeout: 10_000 });
    await otherPage.getByRole("button", { name: "ウソだ！" }).click();

    // 手番プレイヤーの OK ボタンが表示されるまで待つ
    await expect(turnPage!.getByRole("button", { name: "OK" })).toBeVisible({ timeout: 10_000 });
    await turnPage!.getByRole("button", { name: "OK" }).click();

    // 次のターンに戻る
    await expect(async () => {
      const aVisible = await pageA.getByRole("button", { name: "サイコロを振る" }).isVisible().catch(() => false);
      const bVisible = await pageB.getByRole("button", { name: "サイコロを振る" }).isVisible().catch(() => false);
      expect(aVisible || bVisible).toBe(true);
    }).toPass({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });
});
