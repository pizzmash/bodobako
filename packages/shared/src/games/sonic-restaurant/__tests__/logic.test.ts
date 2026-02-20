import { describe, it, expect } from "vitest";
import {
  buildMenuTree,
  createDeck,
  shuffleArray,
  canPlayCard,
  hasAnyPlayableCard,
  getMenuName,
} from "../logic.js";
import { CARD_COUNTS, MENUS, type Card, type SonicRestaurantState } from "../types.js";

describe("createDeck", () => {
  it("各カードの枚数がCARD_COUNTSと一致する", () => {
    const deck = createDeck();
    for (const [card, count] of Object.entries(CARD_COUNTS)) {
      const actual = deck.filter((c) => c === card).length;
      expect(actual, `${card}の枚数`).toBe(count);
    }
  });

  it("デッキの合計枚数が60枚", () => {
    const deck = createDeck();
    const total = Object.values(CARD_COUNTS).reduce((sum, n) => sum + n, 0);
    expect(deck).toHaveLength(total);
  });
});

describe("shuffleArray", () => {
  it("同じ要素を保持する", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it("元の配列を変更しない（不変性）", () => {
    const arr = ["a", "b", "c"];
    shuffleArray(arr);
    expect(arr).toEqual(["a", "b", "c"]);
  });

  it("数値配列でも動作する", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildMenuTree", () => {
  it("ルートノードが返る（card=null, isComplete=false）", () => {
    const tree = buildMenuTree();
    expect(tree.card).toBeNull();
    expect(tree.isComplete).toBe(false);
  });

  it("12種類のメニューが全てツリーに含まれる", () => {
    const tree = buildMenuTree();
    // 各メニューをたどってisComplete=trueのノードが存在するか確認
    for (const [cards, menuName] of MENUS) {
      let node = tree;
      for (const card of cards) {
        const children = node.children;
        expect(children.has(card as Card), `メニュー${menuName}の${card}ノードが存在する`).toBe(true);
        node = children.get(card as Card)!;
      }
      expect(node.isComplete, `メニュー${menuName}の完成ノード`).toBe(true);
    }
  });

  it("ルートのpossibleMenusには全12メニューが含まれる", () => {
    const tree = buildMenuTree();
    expect(tree.possibleMenus).toHaveLength(MENUS.length);
  });

  it("ラーメンのpathが正しく作られている", () => {
    const tree = buildMenuTree();
    // ラーメン: ["ラー", "メン"]
    const raaNode = tree.children.get("ラー");
    expect(raaNode).toBeDefined();
    const menNode = raaNode!.children.get("メン");
    expect(menNode).toBeDefined();
    expect(menNode!.isComplete).toBe(true);
  });
});

describe("getMenuName", () => {
  it("各メニューのカード列から正しいメニュー名を返す", () => {
    for (const [cards, menuName] of MENUS) {
      expect(getMenuName([...cards] as Card[])).toBe(menuName);
    }
  });

  it("存在しないカード列はnullを返す", () => {
    expect(getMenuName(["ラー"])).toBeNull(); // 不完全
    expect(getMenuName(["メン", "ラー"])).toBeNull(); // 逆順
    expect(getMenuName([])).toBeNull();
  });
});

// テスト用のSimpleなState生成
function makeSimpleState(
  currentNodePath: Card[],
  hands: Record<string, Card[]> = {}
): SonicRestaurantState {
  const tree = buildMenuTree();
  let currentNode = tree;
  for (const card of currentNodePath) {
    const children = currentNode.children;
    if (children.has(card)) {
      currentNode = children.get(card)!;
    }
  }
  return {
    phase: "playing",
    playerIds: Object.keys(hands),
    hands,
    currentPath: currentNodePath,
    currentNode,
    playedCardsHistory: [],
    lastCompletedMenu: null,
    finishedOrder: [],
    finished: false,
    winnerId: null,
  };
}

describe("canPlayCard", () => {
  it("ルート状態でメニューの先頭カードは出せる", () => {
    const state = makeSimpleState([]);
    // ルートから出せるカード: ラー, チャー, タン, エビ, シュー, ミソ, シオ, テン, サン
    expect(canPlayCard(state, "ラー")).toBe(true);
    expect(canPlayCard(state, "チャー")).toBe(true);
    expect(canPlayCard(state, "タン")).toBe(true);
  });

  it("ルート状態で「とりけし」は常に出せる", () => {
    const state = makeSimpleState([]);
    expect(canPlayCard(state, "とりけし")).toBe(true);
  });

  it("「ラー」の後は「メン」が出せる", () => {
    const state = makeSimpleState(["ラー"]);
    expect(canPlayCard(state, "メン")).toBe(true);
  });

  it("「ラー」の後は「ラー」自体は出せない（子ノードにない）", () => {
    const state = makeSimpleState(["ラー"]);
    expect(canPlayCard(state, "ラー")).toBe(false);
  });

  it("どのパスにも続かないカードは出せない", () => {
    const state = makeSimpleState([]);
    // "マイ"はルートから直接出せない（シューマイの2番目）
    expect(canPlayCard(state, "マイ")).toBe(false);
  });
});

describe("hasAnyPlayableCard", () => {
  it("出せるカードがある場合はtrue", () => {
    const state = makeSimpleState([], { p1: ["ラー", "メン"] });
    expect(hasAnyPlayableCard(state, "p1")).toBe(true);
  });

  it("どのカードも出せない場合はfalse", () => {
    // ルート状態で"マイ"しかない
    const state = makeSimpleState([], { p1: ["マイ"] });
    expect(hasAnyPlayableCard(state, "p1")).toBe(false);
  });

  it("「とりけし」だけ持っていればtrue（常に出せる）", () => {
    const state = makeSimpleState([], { p1: ["とりけし"] });
    expect(hasAnyPlayableCard(state, "p1")).toBe(true);
  });

  it("存在しないプレイヤーはfalse", () => {
    const state = makeSimpleState([], { p1: ["ラー"] });
    expect(hasAnyPlayableCard(state, "unknown")).toBe(false);
  });

  it("手札が空のプレイヤーはfalse", () => {
    const state = makeSimpleState([], { p1: [] });
    expect(hasAnyPlayableCard(state, "p1")).toBe(false);
  });
});
