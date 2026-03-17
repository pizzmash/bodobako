import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// ブロックストライゴン ゲームフロー（2タブ使用）
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

/** 2人のプレイヤーでブロックストライゴンを開始し、ページとコンテキストを返す */
async function startBlokusTrigonGame(browser: {
  newContext: () => Promise<BrowserContext>;
}) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  await pageA.getByRole("searchbox", { name: "ゲーム検索" }).fill("ブロックストライゴン");
  await pageA.getByLabel("ブロックストライゴンのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();

  // ゲーム開始を確認: BlokusLogo (.blk-logo) とピースパレットが表示される
  await expect(pageA.locator(".blk-logo")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.locator(".blk-logo")).toBeVisible({ timeout: 10_000 });

  return { pageA, pageB, contextA, contextB };
}

test.describe("ブロックストライゴン", () => {
  test("2人でゲームを開始するとボードが表示される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusTrigonGame(browser);

    // 両タブにSVGボードが表示される
    const svgBoardA = pageA.locator("svg.select-none");
    const svgBoardB = pageB.locator("svg.select-none");
    await expect(svgBoardA).toBeVisible({ timeout: 10_000 });
    await expect(svgBoardB).toBeVisible({ timeout: 10_000 });

    // ピースパレットが表示される（少なくとも1つのピースボタンがある）
    await expect(pageA.locator("button.blk-palette-item").first()).toBeVisible();
    await expect(pageB.locator("button.blk-palette-item").first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("ピースパレットにピースが表示される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusTrigonGame(browser);

    // 2人プレイでは各プレイヤーが2色を担当するため、各色22個 × 2色 = 44個のピースボタン
    const pieceBtnsA = pageA.locator("button.blk-palette-item");
    const countA = await pieceBtnsA.count();
    expect(countA).toBeGreaterThanOrEqual(22);

    // 「残り」テキストが表示される（2色分あるので .first() で取得）
    await expect(pageA.getByText(/残り \d+ 個/).first()).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("ピースを選択してボードに配置できる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startBlokusTrigonGame(browser);

    // 手番プレイヤーのページを特定（"▶ 手番" が表示されている方）
    let currentPage: Page;
    const turnMarkerA = pageA.getByText("▶ 手番");
    if (await turnMarkerA.isVisible().catch(() => false)) {
      currentPage = pageA;
    } else {
      currentPage = pageB;
    }

    // 有効な（disabledでない）ピースボタンをクリックして選択
    const enabledPieceBtn = currentPage.locator(
      "button.blk-palette-item:not([disabled])"
    ).first();
    await expect(enabledPieceBtn).toBeVisible({ timeout: 10_000 });
    await enabledPieceBtn.click();

    // 選択状態が反映される（blk-palette-selected クラスが付く）
    await expect(
      currentPage.locator("button.blk-palette-item.blk-palette-selected")
    ).toBeVisible({ timeout: 5_000 });

    // ピースコントロール（回転・反転ボタン）が表示される
    await expect(
      currentPage.locator(".blk-ctrl-btn").first()
    ).toBeVisible();

    // バリアント情報テキストが表示される
    await expect(
      currentPage.getByText(/バリアント \d+ \/ \d+/)
    ).toBeVisible();

    // 有効配置位置のドット（circle）がSVGボード上に表示される
    // fill 属性値に括弧が含まれるためページ内で評価して座標を取得する
    const svgBoard = currentPage.locator("svg.select-none");

    // 有効配置ドット（fill="rgba(30,41,59,0.45)"）を探す
    // 初期バリアントでドットがない場合は回転して再試行（パリティ不一致の対応）
    const rotateBtn = currentPage.locator(".blk-ctrl-btn").first();
    let dotPosition: { x: number; y: number } | null = null;

    for (let variant = 0; variant < 6; variant++) {
      dotPosition = await svgBoard.evaluate((svg) => {
        const circles = svg.querySelectorAll("circle");
        for (const c of circles) {
          if (c.getAttribute("fill") === "rgba(30,41,59,0.45)") {
            const rect = c.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            return {
              x: rect.x + rect.width / 2 - svgRect.x,
              y: rect.y + rect.height / 2 - svgRect.y,
            };
          }
        }
        return null;
      });
      if (dotPosition !== null) break;
      // バリアントを変えて再試行
      if (await rotateBtn.isVisible().catch(() => false)) {
        await rotateBtn.click();
        await currentPage.waitForTimeout(200);
      }
    }

    expect(dotPosition).not.toBeNull();

    if (dotPosition) {
      // 有効配置位置をクリックしてピースを配置
      await svgBoard.click({ position: { x: dotPosition.x, y: dotPosition.y } });

      // 配置後、選択状態が解除される
      await expect(
        currentPage.locator("button.blk-palette-item.blk-palette-selected")
      ).not.toBeVisible({ timeout: 5_000 });

      // 配置済みのセルがアニメーション表示される（bkt-last-piece クラス）
      await expect(
        currentPage.locator("svg.select-none polygon.bkt-last-piece").first()
      ).toBeVisible({ timeout: 5_000 });
    }

    await contextA.close();
    await contextB.close();
  });
});
