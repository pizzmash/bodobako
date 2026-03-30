import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// ハイパーロボットゲームフロー（2タブ使用）
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

/**
 * 2人でハイパーロボットルームを作成・参加し、configuring フェーズまで進める。
 * pageA（Alice）がホスト、pageB（Bob）がゲスト。
 */
async function startHyperRobotGame(browser: { newContext: () => Promise<BrowserContext> }) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("ハイパーロボット");
  await pageA.getByLabel("ハイパーロボットのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  // Room 待機室の「ゲーム開始」ボタン
  await pageA.getByRole("button", { name: "ゲーム開始" }).click();

  // configuring フェーズへ（ボードが起動したことを、常時表示される「残り目標:」で確認）
  // ConfiguringPanel よりも早く検知でき、サーバー負荷時に強い
  // pageA/B 両者の遷移を並列で確認（直列だと合計時間が2倍になる）
  await Promise.all([
    expect(pageA.getByText(/残り目標:/)).toBeVisible({ timeout: 60_000 }),
    expect(pageB.getByText(/残り目標:/)).toBeVisible({ timeout: 60_000 }),
  ]);

  return { pageA, pageB, contextA, contextB, code };
}

/**
 * ConfiguringPanel の「ゲーム開始」をクリックして bidding フェーズへ進める。
 * wsClient.send() は WS が OPEN でないとメッセージを無視するため、
 * クリック後に遷移しなければ間隔を空けてリトライする。
 */
async function proceedToBidding(pageA: Page, pageB: Page) {
  const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
  const biddingLabel = pageA.getByText("宣言フェーズ");

  await startBtn.waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 6; attempt++) {
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }
    try {
      await biddingLabel.waitFor({ state: "visible", timeout: 5_000 });
      break;
    } catch {
      // WS が一時切断中の可能性あり — 少し待ってリトライ
      await pageA.waitForTimeout(500);
    }
  }
  await expect(biddingLabel).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("宣言フェーズ")).toBeVisible({ timeout: 15_000 });
}

/**
 * 両者が宣言・確定して solving フェーズへ進める。
 * bidCountA < bidCountB であると Alice が先手（手数が少ない方が優先）。
 */
async function proceedToSolving(
  pageA: Page,
  pageB: Page,
  bidCountA: number,
  bidCountB: number,
) {
  // pageA: bidCountA 手を宣言（初期値 1 なので bidCountA-1 回「増やす」）
  for (let i = 1; i < bidCountA; i++) {
    await pageA.getByRole("button", { name: "増やす" }).click();
  }
  await pageA.getByRole("button", { name: "宣言する" }).click();
  await pageA.getByRole("button", { name: "宣言を確定する" }).click();

  // pageB の宣言一覧更新を待つ
  await expect(pageB.getByText("宣言一覧")).toBeVisible({ timeout: 10_000 });

  // pageB: bidCountB 手を宣言（初期値 1 なので bidCountB-1 回「増やす」）
  for (let i = 1; i < bidCountB; i++) {
    await pageB.getByRole("button", { name: "増やす" }).click();
  }
  await pageB.getByRole("button", { name: "宣言する" }).click();
  await pageB.getByRole("button", { name: "宣言を確定する" }).click();

  // 両者確定 → solving フェーズへ即時遷移
  // "解決中" は SolvingPanel と HyperRobotPlayerSlot の両方に存在するため
  // SolvingPanel 固有の "残り手数" で確認する
  await expect(pageA.getByText("残り手数")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("残り手数")).toBeVisible({ timeout: 10_000 });
}

// -------------------------------------------------------------------------

test.describe("ハイパーロボットゲーム", () => {
  // startHyperRobotGame が最大 60s かかり、proceedToBidding が DO alarm で
  // 最大 15s かかるため120s に設定
  test.describe.configure({ timeout: 120_000 });
  test("TC-001: configuring フェーズでホストにゲーム設定画面、ゲストに待機メッセージが表示される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);

    // pageA（ホスト）: ゲーム設定画面（残り目標: が出た後なので短いタイムアウトでウェイト）
    await expect(pageA.getByText("ゲーム設定")).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByText("勝利に必要なチップ数")).toBeVisible();

    // pageB（ゲスト）: 待機メッセージ
    await expect(pageB.getByText("ホストの設定を待っています...")).toBeVisible({ timeout: 10_000 });

    // pageB には ConfiguringPanel の「ゲーム開始」ボタンが表示されない
    await expect(pageB.getByRole("button", { name: "ゲーム開始" })).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("TC-002: configuring フェーズから bidding フェーズへ遷移する", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);

    await proceedToBidding(pageA, pageB);

    // 両ページに「宣言フェーズ」ラベルが表示される
    await expect(pageA.getByText("宣言フェーズ")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("宣言フェーズ")).toBeVisible({ timeout: 10_000 });

    // 両ページに「残り目標:」が表示される
    await expect(pageA.getByText(/残り目標:/)).toBeVisible();
    await expect(pageB.getByText(/残り目標:/)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("TC-003: 宣言前はタイマー非表示・「宣言を確定する」ボタンが無効", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // タイマー（「{n}秒」形式）が非表示
    await expect(pageA.getByText(/\d+秒/)).not.toBeVisible();

    // 「宣言を確定する」ボタンが disabled
    await expect(pageA.getByRole("button", { name: "宣言を確定する" })).toBeDisabled();

    await contextA.close();
    await contextB.close();
  });

  test("TC-004: 宣言するとタイマーが起動し宣言一覧に表示、pageB にもリアルタイム反映される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // pageA: 「増やす」を 2 回クリック → bidInput = 3
    await pageA.getByRole("button", { name: "増やす" }).click();
    await pageA.getByRole("button", { name: "増やす" }).click();

    // 「宣言する」クリック
    await pageA.getByRole("button", { name: "宣言する" }).click();

    // pageA: 「宣言一覧」が表示される
    await expect(pageA.getByText("宣言一覧")).toBeVisible({ timeout: 10_000 });

    // pageA: 宣言一覧に「3手」が表示される
    await expect(pageA.getByTestId("bid-list").getByText("3手", { exact: true })).toBeVisible();

    // pageA: タイマーが表示される（宣言後に起動）
    await expect(pageA.getByText(/\d+秒/)).toBeVisible({ timeout: 10_000 });

    // pageB: 「宣言一覧」と「3手」がリアルタイム反映される
    await expect(pageB.getByText("宣言一覧")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId("bid-list").getByText("3手", { exact: true })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("TC-005: 宣言を確定すると「取り消す」が表示され、取り消すと確定ボタンが再表示される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // pageA: 宣言
    await pageA.getByRole("button", { name: "宣言する" }).click();

    // pageA: 「宣言を確定する」クリック
    await pageA.getByRole("button", { name: "宣言を確定する" }).click();

    // 「取り消す」ボタンが表示される
    await expect(pageA.getByRole("button", { name: "取り消す" })).toBeVisible({ timeout: 10_000 });

    // 「取り消す」クリック → 「宣言を確定する」が再び表示される
    await pageA.getByRole("button", { name: "取り消す" }).click();
    await expect(pageA.getByRole("button", { name: "宣言を確定する" })).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("TC-006: 両者確定で solving フェーズへ即時遷移し、低い手数の宣言者が解答権を得る", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // Alice: 2手, Bob: 3手 で solving フェーズへ
    await proceedToSolving(pageA, pageB, 2, 3);

    // 両ページに「残り手数」表示（proceedToSolving でも確認済みだが明示的に再確認）
    await expect(pageA.getByText("残り手数")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("残り手数")).toBeVisible({ timeout: 10_000 });

    // pageA（Alice, 2手 = 低い）に「あなたの番！」表示
    await expect(pageA.getByText("あなたの番！")).toBeVisible({ timeout: 10_000 });

    // 両ページに「残り手数」表示
    await expect(pageA.getByText("残り手数")).toBeVisible();
    await expect(pageB.getByText("残り手数")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("TC-007: ギブアップすると次の解答者に番が移る", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // Alice: 2手, Bob: 3手
    await proceedToSolving(pageA, pageB, 2, 3);

    // pageA（Alice）がギブアップ
    await pageA.getByRole("button", { name: "ギブアップ（次の宣言者へ）" }).click();

    // pageB（Bob）に「あなたの番！」が表示される
    await expect(pageB.getByText("あなたの番！")).toBeVisible({ timeout: 10_000 });

    // pageA（Alice）には「あなたの番！」が表示されない
    await expect(pageA.getByText("あなたの番！")).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("TC-008: 全員がギブアップすると bidding フェーズへ戻り「再宣言ラウンド」が表示される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // Alice: 2手, Bob: 3手 で solving フェーズへ
    await proceedToSolving(pageA, pageB, 2, 3);

    // Alice がギブアップ → Bob の番へ
    await pageA.getByRole("button", { name: "ギブアップ（次の宣言者へ）" }).click();
    await expect(pageB.getByText("あなたの番！")).toBeVisible({ timeout: 10_000 });

    // Bob もギブアップ → 全員失敗 → bidding へ戻る（isRetry=true）
    await pageB.getByRole("button", { name: "ギブアップ（次の宣言者へ）" }).click();

    // 両ページが bidding フェーズへ戻る
    await expect(pageA.getByText("宣言フェーズ")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("宣言フェーズ")).toBeVisible({ timeout: 10_000 });

    // 「再宣言ラウンド」バナーが表示される
    await expect(pageA.getByText("再宣言ラウンド")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("再宣言ラウンド")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("TC-011: 「増やす」を連打しても宣言手数の最大値は 50 で止まる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // 「増やす」を 60 回クリック
    const increaseBtn = pageA.getByRole("button", { name: "増やす" });
    for (let i = 0; i < 60; i++) {
      await increaseBtn.click();
    }

    // 入力値表示が「50」で止まっている（MAX_BID_COUNT = 50）
    await expect(pageA.getByTestId("bid-input-display")).toHaveText("50");

    await contextA.close();
    await contextB.close();
  });

  test("TC-012: solving フェーズで「宣言順」セクションと各宣言が表示される", async ({
    browser,
  }) => {
    const { pageA, pageB, contextA, contextB } = await startHyperRobotGame(browser);
    await proceedToBidding(pageA, pageB);

    // Alice: 2手, Bob: 4手
    await proceedToSolving(pageA, pageB, 2, 4);

    // 「宣言順」セクションが表示される（bids.length > 1 の場合に表示）
    await expect(pageA.getByText("宣言順")).toBeVisible({ timeout: 10_000 });

    // 「2手」「4手」が宣言順リストに表示される
    await expect(pageA.getByText("2手", { exact: true })).toBeVisible();
    await expect(pageA.getByText("4手", { exact: true })).toBeVisible();

    // 「▶」マーカーが表示される（最初の宣言者 = Alice）
    await expect(pageA.getByText(/▶/)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
