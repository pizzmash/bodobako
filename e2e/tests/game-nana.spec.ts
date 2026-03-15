import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// -------------------------------------------------------------------------
// ナナゲームフロー（2タブ使用）
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

/** 2人のプレイヤーでナナゲームを開始し、ページとコンテキストを返す */
async function startNanaGame(browser: {
  newContext: () => Promise<BrowserContext>;
}) {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await setupPlayer(pageA, "Alice");
  // ナナは2ページ目にあるので次のページへ移動
  await pageA.getByLabel("次のページ").click();
  await pageA.getByLabel("ナナのルームを作成").click();
  await expect(pageA).toHaveURL(/\/room\/[A-Z0-9]{4}/);
  const code = pageA.url().match(/\/room\/([A-Z0-9]{4})/)?.[1]!;

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await setupPlayer(pageB, "Bob");
  await pageB.getByRole("textbox", { name: "ルームコード入力" }).fill(code);
  await pageB.getByRole("button", { name: "ルームに参加" }).click();
  await expect(pageA.getByText("Bob")).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole("button", { name: "ゲーム開始" }).click();

  // ナナのフィールドが表示されるのを待つ（手札エリアの「あなたの手札」ラベル）
  await expect(pageA.getByText("あなたの手札")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("あなたの手札")).toBeVisible({ timeout: 10_000 });

  return { pageA, pageB, contextA, contextB };
}

/** 手番プレイヤーのページでフィールドカードを1枚めくる。成功したら true を返す */
async function flipOneFieldCard(pageA: Page, pageB: Page): Promise<boolean> {
  // WS伝播待ちのため、どちらかのページに「あなたの番です」が表示されるまで待つ
  await expect(async () => {
    const aHas = await pageA.getByText("あなたの番です").isVisible().catch(() => false);
    const bHas = await pageB.getByText("あなたの番です").isVisible().catch(() => false);
    expect(aHas || bHas).toBe(true);
  }).toPass({ timeout: 10_000 });

  for (const page of [pageA, pageB]) {
    const isMyTurn = await page.getByText("あなたの番です").isVisible().catch(() => false);
    if (!isMyTurn) continue;

    // クリック可能なフィールドカード（.nana-field-card.clickable）をクリック
    const clickableCard = page.locator(".nana-field-card.clickable").first();
    if (await clickableCard.isVisible().catch(() => false)) {
      await clickableCard.click();
      return true;
    }
  }
  return false;
}

test.describe("ナナゲーム", () => {
  test("2人でゲームを開始するとナナのフィールドが表示される", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startNanaGame(browser);

    // 両タブにナナのUI要素が表示されている
    // フィールドカードが存在する（2人プレイ: 10枚のフィールドカード）
    const fieldCardsA = pageA.locator(".nana-field-card");
    await expect(fieldCardsA.first()).toBeVisible({ timeout: 10_000 });
    const countA = await fieldCardsA.count();
    expect(countA).toBeGreaterThan(0);

    const fieldCardsB = pageB.locator(".nana-field-card");
    await expect(fieldCardsB.first()).toBeVisible({ timeout: 10_000 });

    // 手札が表示されている
    await expect(pageA.getByText("あなたの手札")).toBeVisible();
    await expect(pageB.getByText("あなたの手札")).toBeVisible();

    // 今ターンのカードセクションが表示されている
    await expect(pageA.getByText("今ターンのカード")).toBeVisible();
    await expect(pageB.getByText("今ターンのカード")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test("カードをめくることができる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startNanaGame(browser);

    // 手番プレイヤーのフィールドカードをクリック
    const flipped = await flipOneFieldCard(pageA, pageB);
    expect(flipped).toBe(true);

    // めくった後、いずれかのページでめくられたカード（.nana-card-revealed）が表示される
    await expect(async () => {
      const visibleA = await pageA.locator(".nana-card-revealed").first().isVisible().catch(() => false);
      const visibleB = await pageB.locator(".nana-card-revealed").first().isVisible().catch(() => false);
      expect(visibleA || visibleB).toBe(true);
    }).toPass({ timeout: 5_000 });

    await contextA.close();
    await contextB.close();
  });

  test("2枚めくるとペア判定が行われる", async ({ browser }) => {
    const { pageA, pageB, contextA, contextB } =
      await startNanaGame(browser);

    // 1枚目をめくる
    const flipped1 = await flipOneFieldCard(pageA, pageB);
    expect(flipped1).toBe(true);

    // 2枚目をめくる（同じプレイヤーのターン）。flipOneFieldCard が手番待ちを含む
    const flipped2 = await flipOneFieldCard(pageA, pageB);
    expect(flipped2).toBe(true);

    // 2枚めくった後、手番プレイヤーに確認ボタンが表示される
    for (const page of [pageA, pageB]) {
      const confirmBtn = page.getByRole("button", { name: /確認して/ });
      if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await confirmBtn.click();
        break;
      }
    }

    await contextA.close();
    await contextB.close();
  });
});
