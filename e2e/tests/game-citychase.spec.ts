import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// シティチェイスゲームフロー（2タブ使用）
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

/** 2つのページから、特定テキストが表示されている方を返す */
async function findPageWithText(
  pageA: Page,
  pageB: Page,
  text: string,
  timeout = 10_000
): Promise<{ matching: Page; other: Page }> {
  // 両方のページで何かしらのテキストが表示されるのを待つ
  await Promise.race([
    pageA.getByText(text).waitFor({ state: "visible", timeout }),
    pageB.getByText(text).waitFor({ state: "visible", timeout }),
  ]);

  const aHas = await pageA.getByText(text).isVisible().catch(() => false);
  if (aHas) return { matching: pageA, other: pageB };
  return { matching: pageB, other: pageA };
}

interface GameSetup {
  contextA: BrowserContext;
  contextB: BrowserContext;
  pageA: Page;
  pageB: Page;
}

/** ルーム作成・参加・ゲーム開始・犯人選択までのセットアップ */
async function createRoomAndStartGame(browser: {
  newContext: () => Promise<BrowserContext>;
}): Promise<GameSetup> {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  await pageA.getByLabel("シティチェイスのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  // ゲーム開始
  await pageA.getByRole("button", { name: "ゲーム開始" }).click();
  await expect(pageA.getByText("犯人役のプレイヤーを選んでください")).toBeVisible({
    timeout: 10_000,
  });

  // 犯人を選択（最初のプレイヤーを犯人に）
  await pageA.locator(".cc-role-btn").first().click();

  return { contextA, contextB, pageA, pageB };
}

/** police-setup: ヘリコプター3基を配置する。警察ページを動的に検出して返す */
async function placeAllHelicopters(
  pageA: Page,
  pageB: Page
): Promise<{ policePage: Page; criminalPage: Page }> {
  // 警察ページを検出（「を配置する交差点をクリック」が表示されている方）
  const { matching: policePage, other: criminalPage } = await findPageWithText(
    pageA,
    pageB,
    "を配置する交差点をクリック"
  );

  for (let i = 0; i < 3; i++) {
    // ヘリが未配置のクリック可能な交差点を選ぶ
    const emptyIntersection = policePage
      .locator(".cc-intersection-clickable")
      .filter({ hasNot: policePage.locator("text=/^H\\d$/") });
    await expect(emptyIntersection.first()).toBeVisible({ timeout: 10_000 });
    const beforeCount = await emptyIntersection.count();
    await emptyIntersection.first().click();

    // クリックが受理されたことを確認（未配置交差点が減るか、犯人セットアップに遷移）
    await expect(emptyIntersection).not.toHaveCount(beforeCount, { timeout: 5_000 });
  }

  return { policePage, criminalPage };
}

/** criminal-setup: 犯人が潜伏先ビルを選択する */
async function placeCriminal(
  pageA: Page,
  pageB: Page
): Promise<{ criminalPage: Page; policePage: Page }> {
  // criminal-setup に遷移したことを確認（どちらかに表示される）
  const { matching: criminalPage, other: policePage } = await findPageWithText(
    pageA,
    pageB,
    "潜伏するビルをクリックしてください",
    15_000
  );

  const clickableBuilding = criminalPage.locator(".cc-building-clickable").first();
  await expect(clickableBuilding).toBeVisible({ timeout: 10_000 });
  await clickableBuilding.click();

  return { criminalPage, policePage };
}

/** 警察ターンで全ヘリを操作する（移動 or 捜索） */
async function completePoliceActions(policePage: Page) {
  for (let i = 0; i < 3; i++) {
    // 警察のターン案内が表示されるまで待ってから判定（スナップショット判定を避ける）
    const turnIndicator = policePage.getByText("交差点をクリックで移動");
    const isTurn = await turnIndicator.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isTurn) break;

    // 移動可能な交差点をクリック（移動優先）
    const moveTarget = policePage.locator(".cc-intersection-clickable").first();
    const canMove = await moveTarget.isVisible().catch(() => false);

    if (canMove) {
      await moveTarget.click();
    } else {
      // 移動先がなければビルを捜索
      const searchTarget = policePage.locator(".cc-building-clickable").first();
      await searchTarget.click();
    }

    // クリックが受理されるまで待つ（ターン案内が消えるか、犯人ターンに遷移するまで）
    await expect(turnIndicator).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
  }
}

test.describe("シティチェイス", () => {
  test("2人でゲームを開始し、役職選択フェーズに遷移できる", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("シティチェイスのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);

    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageB).toHaveURL(`/room/${code}`);

    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    const startBtn = pageA.getByRole("button", { name: "ゲーム開始" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // ホスト（Alice）には犯人選択 UI が表示される
    await expect(pageA.getByText("犯人役のプレイヤーを選んでください")).toBeVisible({
      timeout: 10_000,
    });

    // 非ホスト（Bob）は待機メッセージを表示
    await expect(pageB.getByText("ホストが犯人を選んでいます...")).toBeVisible({
      timeout: 10_000,
    });

    // プレイヤー選択ボタンが表示される
    const roleBtn = pageA.locator(".cc-role-btn").first();
    await expect(roleBtn).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("犯人を選択するとセットアップフェーズに遷移する", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("シティチェイスのルームを作成").click();
    await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await setupPlayer(pageB, "Bob");
    await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
    await pageB.getByRole("button", { name: "ルームに参加" }).click();
    await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

    await pageA.getByRole("button", { name: "ゲーム開始" }).click();
    await expect(pageA.getByText("犯人役のプレイヤーを選んでください")).toBeVisible({
      timeout: 10_000,
    });

    // 犯人を選択
    await pageA.locator(".cc-role-btn").first().click();

    // どちらかのページにセットアップUIが表示される
    await Promise.all([
      expect(
        pageA
          .getByText("を配置する交差点をクリック")
          .or(pageA.getByText("がヘリコプターを配置中"))
      ).toBeVisible({ timeout: 10_000 }),
      expect(
        pageB
          .getByText("を配置する交差点をクリック")
          .or(pageB.getByText("がヘリコプターを配置中"))
      ).toBeVisible({ timeout: 10_000 }),
    ]);

    await contextA.close();
    await contextB.close();
  });

  test("警察がヘリコプターを配置できる", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    // 警察ページを検出
    const { matching: policePage } = await findPageWithText(
      pageA,
      pageB,
      "を配置する交差点をクリック"
    );

    // クリック可能な交差点をクリック
    const clickableIntersection = policePage.locator(".cc-intersection-clickable").first();
    await expect(clickableIntersection).toBeVisible({ timeout: 10_000 });
    await clickableIntersection.click();

    // 配置後、次のヘリ配置テキストか犯人セットアップに遷移
    await expect(
      policePage.getByText("を配置する交差点をクリック").or(
        policePage.getByText("犯人が潜伏先を選んでいます")
      )
    ).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("ヘリコプター3基配置後に犯人セットアップに遷移する", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    // 3基のヘリコプターを配置
    await placeAllHelicopters(pageA, pageB);

    // criminal-setup に遷移確認
    const { matching: criminalPage, other: policePage } = await findPageWithText(
      pageA,
      pageB,
      "潜伏するビルをクリックしてください",
      15_000
    );

    // 犯人側にクリック可能なビルが表示される
    const clickableBuilding = criminalPage.locator(".cc-building-clickable").first();
    await expect(clickableBuilding).toBeVisible({ timeout: 10_000 });

    // 警察には待機メッセージが表示
    await expect(
      policePage.getByText("犯人が潜伏先を選んでいます")
    ).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("犯人が潜伏先を選択するとゲームプレイフェーズに遷移する", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    await placeAllHelicopters(pageA, pageB);
    await placeCriminal(pageA, pageB);

    // ゲームプレイフェーズに遷移（ROUND 1 表示）
    await expect(pageA.getByText("ROUND 1 / 11")).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByText("ROUND 1 / 11")).toBeVisible({ timeout: 10_000 });

    // フェーズ表示: POLICE PHASE が両方に表示される（最初は警察ターン）
    await expect(pageA.getByText("[P] POLICE PHASE")).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByText("[P] POLICE PHASE")).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("警察ターンでヘリコプターを移動または捜索できる", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    const { policePage } = await placeAllHelicopters(pageA, pageB);
    await placeCriminal(pageA, pageB);

    // ゲームプレイ開始（ROUND 1、警察ターン）
    await expect(policePage.getByText("ROUND 1 / 11")).toBeVisible({
      timeout: 15_000,
    });

    // 警察のターン案内テキスト
    await expect(
      policePage.getByText("交差点をクリックで移動")
    ).toBeVisible({ timeout: 10_000 });

    // 移動可能な交差点またはクリック可能なビルが表示される
    const moveTarget = policePage.locator(".cc-intersection-clickable").first();
    const searchTarget = policePage.locator(".cc-building-clickable").first();

    const canMove = await moveTarget.isVisible().catch(() => false);
    const canSearch = await searchTarget.isVisible().catch(() => false);

    expect(canMove || canSearch).toBeTruthy();

    if (canMove) {
      await moveTarget.click();
    } else {
      await searchTarget.click();
    }

    // 操作後、次のヘリのターンか犯人ターンに遷移する
    await expect(
      policePage
        .getByText("交差点をクリックで移動")
        .or(policePage.getByText("[T] FUGITIVE PHASE"))
        .or(policePage.getByText("の番です"))
    ).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("警察が全ヘリ操作後に犯人ターンに遷移する", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    const { policePage, criminalPage } = await placeAllHelicopters(pageA, pageB);
    await placeCriminal(pageA, pageB);

    // ゲームプレイ開始
    await expect(policePage.getByText("ROUND 1 / 11")).toBeVisible({
      timeout: 15_000,
    });

    // 警察が3基のヘリをすべて操作する
    await completePoliceActions(policePage);

    // 犯人ターンに遷移
    await expect(
      criminalPage.getByText("移動先のビルを選択してください")
    ).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });

  test("犯人ターンでビルに移動できる", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    const { policePage, criminalPage } = await placeAllHelicopters(pageA, pageB);
    await placeCriminal(pageA, pageB);

    // ゲームプレイ開始
    await expect(policePage.getByText("ROUND 1 / 11")).toBeVisible({
      timeout: 15_000,
    });

    // 警察が全ヘリ操作
    await completePoliceActions(policePage);

    // 犯人ターン: 移動先選択テキストが表示
    await expect(
      criminalPage.getByText("移動先のビルを選択してください")
    ).toBeVisible({ timeout: 10_000 });

    // 移動可能なビルをクリック
    const moveTarget = criminalPage.locator(".cc-building-clickable").first();
    await expect(moveTarget).toBeVisible({ timeout: 10_000 });
    await moveTarget.click();

    // 犯人移動後、次のラウンドの警察ターンに遷移（ROUND 2）
    await expect(policePage.getByText("ROUND 2 / 11")).toBeVisible({
      timeout: 10_000,
    });

    await contextA.close();
    await contextB.close();
  });

  test("プレイヤーパネルに役職バッジが表示される", async ({ browser }) => {
    const { contextA, contextB, pageA, pageB } =
      await createRoomAndStartGame(browser);

    const { policePage, criminalPage } = await placeAllHelicopters(pageA, pageB);

    // セットアップフェーズでプレイヤーパネルの役職バッジが表示される
    await expect(criminalPage.getByText("FUGITIVE").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(policePage.getByText("POLICE").first()).toBeVisible({
      timeout: 10_000,
    });

    // 自分を示す YOU バッジが表示される
    await expect(criminalPage.getByText("YOU").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(policePage.getByText("YOU").first()).toBeVisible({
      timeout: 10_000,
    });

    await contextA.close();
    await contextB.close();
  });
});
