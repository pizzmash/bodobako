import { describe, it, expect } from "vitest";
import { checkWinCondition, createDeck, getActiveHandCard } from "../logic.js";
import type { NanaCard } from "../types.js";

// ---- createDeck ----

describe("createDeck", () => {
  it("2人: 30枚、数字1-10 各3枚", () => {
    const deck = createDeck(2);
    expect(deck).toHaveLength(30);
    for (let n = 1; n <= 10; n++) {
      expect(deck.filter((c) => c.number === n)).toHaveLength(3);
    }
    expect(deck.some((c) => c.number === 11)).toBe(false);
    expect(deck.some((c) => c.number === 12)).toBe(false);
  });

  it("3人: 33枚、数字1-11 各3枚", () => {
    const deck = createDeck(3);
    expect(deck).toHaveLength(33);
    for (let n = 1; n <= 11; n++) {
      expect(deck.filter((c) => c.number === n)).toHaveLength(3);
    }
    expect(deck.some((c) => c.number === 12)).toBe(false);
  });

  it("4人: 36枚、数字1-12 各3枚", () => {
    const deck = createDeck(4);
    expect(deck).toHaveLength(36);
    for (let n = 1; n <= 12; n++) {
      expect(deck.filter((c) => c.number === n)).toHaveLength(3);
    }
  });

  it("5人: 36枚、数字1-12 各3枚", () => {
    const deck = createDeck(5);
    expect(deck).toHaveLength(36);
    for (let n = 1; n <= 12; n++) {
      expect(deck.filter((c) => c.number === n)).toHaveLength(3);
    }
  });

  it("各カードは一意のIDを持つ", () => {
    const deck = createDeck(4);
    const ids = deck.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(deck.length);
  });
});

// ---- getActiveHandCard ----

const makeHand = (numbers: number[]): NanaCard[] =>
  numbers.map((n, i) => ({ id: i, number: n }));

describe("getActiveHandCard", () => {
  const hand = makeHand([2, 5, 7, 9, 10]); // id: 0-4

  it("min: 除外なしのとき最小カードを返す", () => {
    const card = getActiveHandCard(hand, [], "min");
    expect(card?.number).toBe(2);
    expect(card?.id).toBe(0);
  });

  it("max: 除外なしのとき最大カードを返す", () => {
    const card = getActiveHandCard(hand, [], "max");
    expect(card?.number).toBe(10);
    expect(card?.id).toBe(4);
  });

  it("min: 最小(id=0)を除外すると次の最小を返す", () => {
    const card = getActiveHandCard(hand, [0], "min");
    expect(card?.number).toBe(5);
  });

  it("max: 最大(id=4)を除外すると次の最大を返す", () => {
    const card = getActiveHandCard(hand, [4], "max");
    expect(card?.number).toBe(9);
  });

  it("全カードを除外すると null を返す", () => {
    const allIds = hand.map((c) => c.id);
    expect(getActiveHandCard(hand, allIds, "min")).toBeNull();
    expect(getActiveHandCard(hand, allIds, "max")).toBeNull();
  });

  it("空の手札は null を返す", () => {
    expect(getActiveHandCard([], [], "min")).toBeNull();
    expect(getActiveHandCard([], [], "max")).toBeNull();
  });

  it("1枚のみの場合、min と max どちらも同じカードを返す", () => {
    const single = makeHand([6]);
    expect(getActiveHandCard(single, [], "min")?.number).toBe(6);
    expect(getActiveHandCard(single, [], "max")?.number).toBe(6);
  });
});

// ---- checkWinCondition ----

describe("checkWinCondition", () => {
  describe("条件3: 7のセットを所持", () => {
    it("7のみで勝利", () => {
      expect(checkWinCondition([7])).toBe(true);
    });

    it("他のセットと合わせても勝利", () => {
      expect(checkWinCondition([3, 7])).toBe(true);
    });
  });

  describe("条件1: 3種類のセットを所持", () => {
    it("3種類で勝利", () => {
      expect(checkWinCondition([1, 3, 6])).toBe(true);
    });

    it("4種類以上でも勝利", () => {
      expect(checkWinCondition([1, 2, 3, 4])).toBe(true);
    });
  });

  describe("条件2: 2セットの和/差が7", () => {
    it("和が7: 1+6=7", () => {
      expect(checkWinCondition([1, 6])).toBe(true);
    });

    it("和が7: 2+5=7", () => {
      expect(checkWinCondition([2, 5])).toBe(true);
    });

    it("和が7: 3+4=7", () => {
      expect(checkWinCondition([3, 4])).toBe(true);
    });

    it("差が7: 8-1=7", () => {
      expect(checkWinCondition([1, 8])).toBe(true);
    });

    it("差が7: 9-2=7", () => {
      expect(checkWinCondition([2, 9])).toBe(true);
    });

    it("差が7: 10-3=7", () => {
      expect(checkWinCondition([3, 10])).toBe(true);
    });

    it("差が7: 11-4=7 (4人以上)", () => {
      expect(checkWinCondition([4, 11])).toBe(true);
    });

    it("差が7: 12-5=7 (4人以上)", () => {
      expect(checkWinCondition([5, 12])).toBe(true);
    });
  });

  describe("勝利条件を満たさない", () => {
    it("空のリスト", () => {
      expect(checkWinCondition([])).toBe(false);
    });

    it("1種類のセット（7以外）", () => {
      expect(checkWinCondition([3])).toBe(false);
    });

    it("2種類で和/差が7にならない: 2+4=6", () => {
      expect(checkWinCondition([2, 4])).toBe(false);
    });

    it("2種類で和/差が7にならない: 1+3=4", () => {
      expect(checkWinCondition([1, 3])).toBe(false);
    });

    it("2種類で和/差が7にならない: 2+3=5", () => {
      expect(checkWinCondition([2, 3])).toBe(false);
    });
  });
});
