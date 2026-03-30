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
  const diceButtonA = pageA.getByRole("button", { name: "サイコロを振る" });
  const diceButtonB = pageB.getByRole("button", { name: "サイコロを振る" });

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

  await dutyPage.getByRole("button", { name: "サイコロを振る" }).click();
  return { dutyPage, otherPage };
}

/**
 * サイコロを振り card-selection フェーズに到達するまで繰り返す。
 * dice=1 or 6 の場合: draw-cards → 当番ローテート → 次プレイヤーの dice-roll → 再ロール
 * dice=2-5 の場合: 即 card-selection へ遷移
 * @returns card-selection フェーズの当番ページ（「修理を確定する →」ボタンを持つ側）
 */
async function rollDiceUntilCardSelection(
  pageA: Page,
  pageB: Page
): Promise<{ dutyPage: Page; otherPage: Page }> {
  for (let i = 0; i < 6; i++) {
    await rollDice(pageA, pageB);
    await drawCardsIfNeeded(pageA, pageB);

    // card-selection に到達したかを「必要:X枚」テキスト（両ページに表示）で確認（5秒以内）
    const reached = await Promise.any([
      pageA
        .getByText(/必要:.*枚/)
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true),
      pageB
        .getByText(/必要:.*枚/)
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true),
    ]).catch(() => false);

    if (reached) {
      // 「修理を確定する →」ボタンが表示されるのは当番プレイヤーのみ
      // どちらのページに表示されるかで当番を判定する（描画を待つため最大3秒）
      const confirmBtnA = pageA.getByRole("button", { name: "修理を確定する →" });
      const confirmBtnB = pageB.getByRole("button", { name: "修理を確定する →" });
      const dutyPage = await Promise.any([
        confirmBtnA.waitFor({ state: "visible", timeout: 3_000 }).then(() => pageA),
        confirmBtnB.waitFor({ state: "visible", timeout: 3_000 }).then(() => pageB),
      ]).catch(() => null);
      if (dutyPage) return { dutyPage, otherPage: dutyPage === pageA ? pageB : pageA };
      // card-selection に到達したがボタンが見えない場合は想定外の状態
      throw new Error("card-selection に到達したが「修理を確定する →」ボタンが見つかりませんでした");
    }
    // dice=1 or 6 により当番がローテートして dice-roll に戻った → 再ループ
  }
  throw new Error("6ラウンドのサイコロで card-selection に到達できませんでした");
}

/**
 * dice=1 or 6 のとき発生する draw-cards フェーズを処理する。
 * 「▲引く」テキスト（山札クリックのヒント）が表示されたらクリックして
 * カードを引く。表示されなければ即座に返る。
 */
async function drawCardsIfNeeded(pageA: Page, pageB: Page): Promise<void> {
  // draw-cards フェーズが発生していれば「▲引く」が最大 10 秒以内に表示される
  // 表示されなければ draw-cards フェーズは発生していないので即返る
  const drawAppeared = await Promise.any([
    pageA.getByText("▲引く").waitFor({ state: "visible", timeout: 10_000 }).then(() => true),
    pageB.getByText("▲引く").waitFor({ state: "visible", timeout: 10_000 }).then(() => true),
  ]).catch(() => false);

  if (!drawAppeared) return;

  for (let i = 0; i < 15; i++) {
    const [aHasDraw, bHasDraw] = await Promise.all([
      pageA.getByText("▲引く").isVisible().catch(() => false),
      pageB.getByText("▲引く").isVisible().catch(() => false),
    ]);
    if (!aHasDraw && !bHasDraw) break;

    const drawPage = aHasDraw ? pageA : pageB;
    await drawPage.getByText("▲引く").click();
    // カードオーバーレイが 2 秒後に自動解除されるので余裕を持って待つ
    await drawPage.waitForTimeout(3000);
  }
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
      name: "サイコロを振る",
    });
    const waitingTextA = pageA.getByText(/がサイコロを振っています/);
    const diceButtonB = pageB.getByRole("button", {
      name: "サイコロを振る",
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
    // dice=1 or 6 の場合は draw-cards → 当番ローテート → 再ロールが必要なため
    // card-selection に到達するまでサイコロを振り続ける
    const { dutyPage } = await rollDiceUntilCardSelection(pageA, pageB);

    // カード選択フェーズへ遷移確認
    await expect(
      dutyPage.getByText(/必要:.*枚/).or(dutyPage.getByText(/選択中:/))
    ).toBeVisible({ timeout: 5_000 });

    await contextA.close();
    await contextB.close();
  });

  test("カード選択と修理確定ボタンが表示される", async ({ browser }) => {
    test.setTimeout(90_000);

    const { pageA, pageB, contextA, contextB } =
      await startNyaMensGame(browser);

    await readyBothPlayers(pageA, pageB);
    // dice=1 or 6 の場合は draw-cards → 当番ローテート → 再ロールが必要なため
    // card-selection に到達するまでサイコロを振り続ける
    const { dutyPage } = await rollDiceUntilCardSelection(pageA, pageB);

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
