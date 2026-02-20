import { test, expect, type Page } from "@playwright/test";

// -------------------------------------------------------------------------
// シティチェイスゲームフロー（2タブ使用）
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

test.describe("シティチェイス", () => {
  test("2人でゲームを開始し、役職選択フェーズに遷移できる", async ({ browser }) => {
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("シティチェイスのルームを作成").click();
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
    // タブ A: Alice がルームを作成
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await setupPlayer(pageA, "Alice");
    await pageA.getByLabel("シティチェイスのルームを作成").click();
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
    await expect(pageA.getByText("犯人役のプレイヤーを選んでください")).toBeVisible({
      timeout: 10_000,
    });

    // Alice が犯人を選択（最初の .cc-role-btn をクリック）
    await pageA.locator(".cc-role-btn").first().click();

    // 犯人セットアップフェーズに遷移（犯人は潜伏先を選ぶ）
    // 犯人（選ばれたプレイヤー）のページに「潜伏するビルをクリックしてください」か
    // 「ヘリコプターを配置」のいずれかが表示される
    const criminalText = "潜伏するビルをクリックしてください";
    const policeText = "ヘリ";

    // pageA か pageB のどちらかに犯人または警察のセットアップ UI が表示される
    await Promise.all([
      expect(
        pageA.getByText(criminalText).or(pageA.getByText(policeText)).or(
          pageA.getByText("が潜伏先を選んでいます")
        )
      ).toBeVisible({ timeout: 10_000 }),
      expect(
        pageB.getByText(criminalText).or(pageB.getByText(policeText)).or(
          pageB.getByText("が潜伏先を選んでいます")
        )
      ).toBeVisible({ timeout: 10_000 }),
    ]);

    await contextA.close();
    await contextB.close();
  });
});
