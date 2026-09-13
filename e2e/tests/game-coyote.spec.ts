import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { CoyotePlayerView } from '../../packages/shared/src/games/coyote/types';

interface Seat { page: Page; context: BrowserContext; id: string; view: CoyotePlayerView | null }
async function startGame(browser: Browser, count = 2) {
  const seats: Seat[] = [];
  for (let i = 0; i < count; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(name => localStorage.setItem('bodobako:playerName', name), `Player ${i + 1}`);
    const seat: Seat = { page, context, id: '', view: null };
    seats.push(seat);
    page.on('websocket', socket => socket.on('framereceived', event => {
      const msg = JSON.parse(String(event.payload));
      if (msg.type === 'game:started' || msg.type === 'game:stateUpdated') seat.view = msg.state;
      if (msg.type === 'ack' && msg.data?.gameState) seat.view = msg.data.gameState;
    }));
    await page.goto('/');
    if (i === 0) {
      await page.getByRole('searchbox', { name: 'ゲーム検索' }).fill('コヨーテ');
      await page.getByLabel('コヨーテのルームを作成').click();
      await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    } else {
      await page.getByRole('textbox', { name: 'ルームコード' }).fill(seats[0].page.url().split('/').pop()!);
      await page.getByRole('button', { name: 'ルームに参加', exact: true }).click();
      await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}/);
    }
    seat.id = (await page.evaluate(() => localStorage.getItem('bodobako:playerId')))!;
  }
  await expect(seats[0].page.getByText(`Player ${count}`, { exact: true })).toBeVisible();
  await seats[0].page.getByRole('button', { name: 'ゲーム開始', exact: true }).click();
  for (const seat of seats) await expect(seat.page.getByRole('main', { name: 'コヨーテの対戦' })).toBeVisible();
  return seats;
}
async function synced(seats: Seat[], revision: number) {
  await expect.poll(() => seats.every(seat => seat.view?.revision === revision)).toBe(true);
}

test('コヨーテ: 2端末で公開・再接続・優勝・再戦', async ({ browser }, info) => {
  const seats = await startGame(browser);
  try {
    await synced(seats, 0);
    for (const seat of seats) {
      expect(seat.view!.hands[seat.id]).toEqual({ hidden: true });
      await expect(seat.page.getByRole('img', { name: 'あなたのカード、非公開' })).toBeVisible();
    }
    await seats[0].page.setViewportSize({ width: 390, height: 844 });
    await seats[0].page.screenshot({ path: info.outputPath('coyote-mobile.png'), fullPage: true });
    let revision = 0;
    for (let round = 0; round < 3; round++) {
      const state = seats[0].view!;
      const bidder = seats.find(seat => seat.id === state.playerIds[state.currentPlayerIndex])!;
      const other = seats.find(seat => seat !== bidder)!;
      await bidder.page.getByRole('textbox', { name: '宣言する数' }).fill('999');
      await bidder.page.getByRole('button', { name: '999を宣言' }).click();
      await synced(seats, ++revision);
      await other.page.getByRole('button', { name: 'コヨーテ！' }).click();
      await synced(seats, ++revision);
      expect(seats[0].view!.roundResult).toEqual(seats[1].view!.roundResult);
      await expect(other.page.getByRole('heading', { name: 'コヨーテ成功！' })).toBeVisible();
      if (round === 0) {
        await other.page.reload();
        await expect(other.page.getByRole('heading', { name: 'コヨーテ成功！' })).toBeVisible();
        expect(other.view!.revision).toBe(revision);
        await other.page.screenshot({ path: info.outputPath('coyote-reveal.png'), fullPage: true });
      }
      const result = seats[0].view!;
      const next = seats.find(seat => seat.id === result.playerIds[result.currentPlayerIndex])!;
      await next.page.getByRole('button', { name: round === 2 ? '最終結果へ' : '次のラウンドへ' }).click();
      await synced(seats, ++revision);
      if (round === 0) {
        const seat = seats[0];
        expect(seat.view!.discardCounts).toEqual(seats[1].view!.discardCounts);
        await seat.page.getByRole('button', { name: /使用済み/ }).click();
        await expect(seat.page.getByRole('dialog')).toBeVisible();
        await seat.page.getByRole('button', { name: '閉じる', exact: true }).click();
      }
    }
    expect(seats[0].view!.phase).toBe('finished');
    await expect(seats[0].page.getByRole('button', { name: '再戦する' })).toBeVisible();
    // Existing rematch confirmation flow.
    await seats[0].page.getByRole('button', { name: '再戦する' }).click();
    await seats[1].page.getByRole('button', { name: /再戦/ }).first().click();
    const confirm = seats[0].page.getByRole('button', { name: 'このメンバーで再戦' }).last();
    await confirm.click();
    await synced(seats, 0);
    expect(seats[0].view!.roundNumber).toBe(1);
    expect(Object.values(seats[0].view!.lives)).toEqual([3, 3]);
  } finally { for (const seat of seats) await seat.context.close(); }
});

for (const count of [6, 10]) test(`コヨーテ: ${count}人のレスポンシブ配置と使用済み一覧`, async ({ browser }, info) => {
  test.setTimeout(90000);
  const seats = await startGame(browser, count);
  try {
    await synced(seats, 0);
    const turn = seats.find(seat => seat.id === seats[0].view!.playerIds[seats[0].view!.currentPlayerIndex])!;
    for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await turn.page.setViewportSize(size);
      const input = turn.page.getByRole('textbox', { name: '宣言する数' });
      await expect(input).toBeVisible();
      const board = turn.page.getByRole('main', { name: 'コヨーテの対戦' });
      const boardBox = await board.boundingBox();
      const headerBox = await turn.page.getByRole('banner').boundingBox();
      expect(Math.abs(boardBox!.y - (headerBox!.y + headerBox!.height))).toBeLessThanOrEqual(1);
      const bottom = size.width < 640 ? size.height - 52 : size.height;
      expect(Math.abs(boardBox!.y + boardBox!.height - bottom)).toBeLessThanOrEqual(1);
      await expect(board.locator('header')).toHaveCount(0);
      const box = await input.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      await expect(input).toBeInViewport();
      if (size.width < 640) {
        const content = turn.page.locator('.cy-game-content');
        await content.evaluate(el => { el.scrollTop = el.scrollHeight; });
        await expect(turn.page.locator('.cy-current-status')).toBeInViewport();
        await content.evaluate(el => { el.scrollTop = 0; });
      }
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(await turn.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await turn.page.screenshot({ path: info.outputPath(`coyote-${count}-${size.width}.png`), fullPage: true });
    }
    await turn.page.getByRole('button', { name: /使用済み/ }).click();
    await expect(turn.page.getByRole('dialog')).toContainText('使用済みカード · 0枚');
    await turn.page.keyboard.press('Escape');
    await expect(turn.page.getByRole('dialog')).not.toBeVisible();
  } finally { for (const seat of seats) await seat.context.close(); }
});
