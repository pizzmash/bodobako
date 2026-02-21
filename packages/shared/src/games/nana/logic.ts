import type { NanaCard } from "./types.js";

/**
 * 人数に応じたカードデッキを生成してシャッフルする。
 * - 2人: 1-10 × 3枚 = 30枚
 * - 3人: 1-11 × 3枚 = 33枚
 * - 4-5人: 1-12 × 3枚 = 36枚
 */
export function createDeck(playerCount: number): NanaCard[] {
  const maxNumber = playerCount === 2 ? 10 : playerCount === 3 ? 11 : 12;
  const cards: NanaCard[] = [];
  let id = 0;
  for (let n = 1; n <= maxNumber; n++) {
    for (let i = 0; i < 3; i++) {
      cards.push({ id: id++, number: n });
    }
  }
  // Fisher-Yates シャッフル
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * 手札から excludeIds を除いた最大または最小のカードを返す。
 * 手札は昇順ソート済み前提。該当カードがない場合は null。
 */
export function getActiveHandCard(
  hand: NanaCard[],
  excludeIds: number[],
  position: "max" | "min",
): NanaCard | null {
  const excludeSet = new Set(excludeIds);
  const available = hand.filter((c) => !excludeSet.has(c.id));
  if (available.length === 0) return null;
  return position === "min"
    ? available[0]
    : available[available.length - 1];
}

/**
 * 勝利条件チェック。
 * - 条件1: 3種類のセットを所持
 * - 条件2: 2種類のセットの和または差が 7
 * - 条件3: 7 のセットを所持（単独で勝利）
 */
export function checkWinCondition(collectedNumbers: number[]): boolean {
  if (collectedNumbers.includes(7)) return true; // 条件3
  if (collectedNumbers.length >= 3) return true;  // 条件1
  if (collectedNumbers.length >= 2) {             // 条件2
    for (let i = 0; i < collectedNumbers.length; i++) {
      for (let j = i + 1; j < collectedNumbers.length; j++) {
        const a = collectedNumbers[i];
        const b = collectedNumbers[j];
        if (a + b === 7 || Math.abs(a - b) === 7) return true;
      }
    }
  }
  return false;
}
