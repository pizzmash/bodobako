import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// ニャーメンズゲームフロー（2タブ使用）
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

/** 2人のプレイヤーでニャーメンズゲームを開始し、ページとコンテキストを返す */
async function startNyaMensGame(browser: {
  newContext: () => Promise<BrowserContext>;
}) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  // ニャーメンズはページ2にある可能性があるため検索してから作成
  await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("ニャーメンズ");
  await pageA.getByLabel("ニャーメンズのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();

  return { pageA, pageB, contextA, contextB };
}

/** 両プレイヤーの準備完了を実行 */
async function readyBothPlayers(pageA: Page, pageB: Page) {
  await pageA
    .getByRole("button", { name: "準備完了" })
    .waitFor({ state: "visible", timeout: 10_000 });
  await pageA.getByRole("button", { name: "準備完了" }).click();
  await pageB
    .getByRole("button", { name: "準備完了" })
    .waitFor({ state: "visible", timeout: 10_000 });
  await pageB.getByRole("button", { name: "準備完了" }).click();
}

/** サイコロを振り、当番ページと非当番ページを返す */
async function rollDice(
  pageA: Page,
  pageB: Page
): Promise<{ dutyPage: Page; otherPage: Page }> {
  // 当番プレイヤーのサイコロボタンが表示されるのを待つ
  const diceButtonA = pageA.getByRole("button", { name: "🎲 サイコロを振る" });
  const diceButtonB = pageB.getByRole("button", { name: "🎲 サイコロを振る" });

  // どちらかにサイコロボタンが表示されるまで待つ
  await Promise.race([
    diceButtonA.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    diceButtonB.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
  ]);

  // どちらのページが当番かを確認（waitFor後に isVisible でチェック）
  const aVisible = await diceButtonA.isVisible().catch(() => false);
  const bVisible = await diceButtonB.isVisible().catch(() => false);
  // サイレント失敗の検出: 少なくとも一方が表示されていなければ失敗
  if (!aVisible && !bVisible) {
    throw new Error("サイコロボタンがどちらのページにも表示されませんでした");
  }

  const dutyPage = aVisible ? pageA : pageB;
  const otherPage = aVisible ? pageB : pageA;

  await dutyPage.getByRole("button", { name: "🎲 サイコロを振る" }).click();
  return { dutyPage, otherPage };
}

test.describe("ニャーメンズゲーム", () => {
  test("2人でゲームを開始すると役職公開フェーズが表示される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } =
      await startNyaMensGame(browser);

    // 両タブに役職説明テキストが表示される
    await expect(
      pageA.getByText("あなたは隊員です").or(pageA.getByText("あなたは裏切り者です"))
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      pageB.getByText("あなたは隊員です").or(pageB.getByText("あなたは裏切り者です"))
    ).toBeVisible({ timeout: 10_000 });

    // 「準備完了」ボタンが表示される
    await expect(
      pageA.getByRole("button", { name: "準備完了" })
    ).toBeVisible();
    await expect(
      pageB.getByRole("button", { name: "準備完了" })
    ).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("準備完了後にサイコロフェーズに遷移する", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startNyaMensGame(browser);

    await readyBothPlayers(pageA, pageB);

    // サイコロフェーズへ遷移: どちらかに「サイコロを振る」ボタンまたは待機テキストが表示される
    const diceButtonA = pageA.getByRole("button", {
      name: "🎲 サイコロを振る",
    });
    const waitingTextA = pageA.getByText(/がサイコロを振っています/);
    const diceButtonB = pageB.getByRole("button", {
      name: "🎲 サイコロを振る",
    });
    const waitingTextB = pageB.getByText(/がサイコロを振っています/);

    // 当番プレイヤーにはサイコロボタン、もう一方には待機テキストが表示される
    await Promise.race([
      diceButtonA.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {}),
      waitingTextA.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {}),
      diceButtonB.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {}),
      waitingTextB.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {}),
    ]);

    // 少なくともどちらか一方にサイコロ関連の要素が表示されている
    const aVisible =
      (await diceButtonA.isVisible().catch(() => false)) ||
      (await waitingTextA.isVisible().catch(() => false));
    const bVisible =
      (await diceButtonB.isVisible().catch(() => false)) ||
      (await waitingTextB.isVisible().catch(() => false));
    expect(aVisible || bVisible).toBe(true);

    await contextA.close();
    await contextB.close();
  });

  test("サイコロを振るとカード選択フェーズに遷移する", async ({ browser }) => {
    test.setTimeout(90_000);

    const { pageA, pageB, contextA, contextB } =
      await startNyaMensGame(browser);

    await readyBothPlayers(pageA, pageB);
    await rollDice(pageA, pageB);

    // カード選択フェーズへ遷移: 「必要:」or「選択中:」テキストが表示される
    // draw-cards フェーズ（サイコロ1or6時）を経由すると最大10秒かかるため余裕を持たせる
    // Promise.any: 1つでも成功すれば通過、全て失敗（タイムアウト）した場合のみエラー
    await Promise.any([
      pageA.getByText(/必要:.*枚/).waitFor({ state: "visible", timeout: 40_000 }),
      pageA.getByText(/選択中:/).waitFor({ state: "visible", timeout: 40_000 }),
      pageB.getByText(/必要:.*枚/).waitFor({ state: "visible", timeout: 40_000 }),
      pageB.getByText(/選択中:/).waitFor({ state: "visible", timeout: 40_000 }),
    ]);

    await contextA.close();
    await contextB.close();
  });

  test("カード選択と修理確定ボタンが表示される", async ({ browser }) => {
    test.setTimeout(90_000);

    const { pageA, pageB, contextA, contextB } =
      await startNyaMensGame(browser);

    await readyBothPlayers(pageA, pageB);
    const { dutyPage } = await rollDice(pageA, pageB);

    // カード選択フェーズまで待機（draw-cards 経由で最大10秒かかる場合あり）
    // Promise.any: 1つでも成功すれば通過
    await Promise.any([
      pageA.getByText(/必要:.*枚/).waitFor({ state: "visible", timeout: 40_000 }),
      pageA.getByText(/選択中:/).waitFor({ state: "visible", timeout: 40_000 }),
      pageB.getByText(/必要:.*枚/).waitFor({ state: "visible", timeout: 40_000 }),
      pageB.getByText(/選択中:/).waitFor({ state: "visible", timeout: 40_000 }),
    ]);
    await expect(
      dutyPage.getByText(/必要:.*枚/).or(dutyPage.getByText(/選択中:/))
    ).toBeVisible({ timeout: 5_000 });

    // 当番プレイヤーに「修理を確定する →」ボタンが存在する
    const confirmBtn = dutyPage.getByRole("button", {
      name: "修理を確定する →",
    });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });

    await contextA.close();
    await contextB.close();
  });
});
