import { describe, it, expect } from "vitest";
import { sonicRestaurantGame } from "../definition.js";
import { buildMenuTree, createDeck } from "../logic.js";
import { CARD_COUNTS, type Card, type SonicRestaurantState } from "../types.js";

const P1 = "player1";
const P2 = "player2";
const P3 = "player3";

function makePlayingState(hands: Record<string, Card[]>): SonicRestaurantState {
  const tree = buildMenuTree();
  return {
    phase: "playing",
    playerIds: Object.keys(hands),
    hands,
    currentPath: [],
    currentNode: tree,
    playedCardsHistory: [],
    lastCompletedMenu: null,
    finishedOrder: [],
    finished: false,
  };
}

describe("createInitialState", () => {
  it("phase=countdownで始まる", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(state.phase).toBe("countdown");
  });

  it("playerIdsが正しく設定される", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(state.playerIds).toEqual([P1, P2]);
  });

  it("全プレイヤーに手札が配られる", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(state.hands[P1]).toBeDefined();
    expect(state.hands[P2]).toBeDefined();
    expect(state.hands[P1].length).toBeGreaterThan(0);
    expect(state.hands[P2].length).toBeGreaterThan(0);
  });

  it("全カード合計枚数が60枚（2人の場合: 30+30）", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    const total = state.hands[P1].length + state.hands[P2].length;
    const deckSize = Object.values(CARD_COUNTS).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(deckSize);
  });

  it("currentPath=[], finished=falseで始まる", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(state.currentPath).toEqual([]);
    expect(state.finished).toBe(false);
  });
});

describe("parseMove", () => {
  it("countdown-completeを正しくパースする", () => {
    const move = sonicRestaurantGame.parseMove!({ type: "countdown-complete" });
    expect(move).toEqual({ type: "countdown-complete" });
  });

  it("play-cardを正しくパースする", () => {
    const move = sonicRestaurantGame.parseMove!({ type: "play-card", card: "ラー", handIndex: 0 });
    expect(move).toEqual({ type: "play-card", card: "ラー", handIndex: 0 });
  });

  it("不明なtypeはnull", () => {
    expect(sonicRestaurantGame.parseMove!({ type: "invalid" })).toBeNull();
  });

  it("nullはnull", () => {
    expect(sonicRestaurantGame.parseMove!(null)).toBeNull();
  });

  it("typeがない場合はnull", () => {
    expect(sonicRestaurantGame.parseMove!({ card: "ラー" })).toBeNull();
  });

  it("play-cardでcardが文字列でない場合はnull", () => {
    expect(sonicRestaurantGame.parseMove!({ type: "play-card", card: 123, handIndex: 0 })).toBeNull();
  });

  it("play-cardでhandIndexが整数でない場合はnull", () => {
    expect(sonicRestaurantGame.parseMove!({ type: "play-card", card: "ラー", handIndex: 1.5 })).toBeNull();
    expect(sonicRestaurantGame.parseMove!({ type: "play-card", card: "ラー", handIndex: "0" })).toBeNull();
  });
});

describe("validateMove", () => {
  it("countdown中はcountdown-completeが通る", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(sonicRestaurantGame.validateMove(state, { type: "countdown-complete" }, P1)).toBe(true);
  });

  it("countdown中はplay-cardが通らない", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    const hand = state.hands[P1];
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: hand[0], handIndex: 0 }, P1)
    ).toBe(false);
  });

  it("playing中に正しいカードを正しいindexで出せる", () => {
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    // P1の手札index=0は"ラー"
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1)
    ).toBe(true);
  });

  it("handIndexのカードとcardが一致しない場合は無効", () => {
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    // index=0は"ラー"なのに"メン"を指定
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "メン", handIndex: 0 }, P1)
    ).toBe(false);
  });

  it("範囲外のhandIndexは無効", () => {
    const state = makePlayingState({ [P1]: ["ラー"], [P2]: ["チャー"] });
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "ラー", handIndex: 5 }, P1)
    ).toBe(false);
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "ラー", handIndex: -1 }, P1)
    ).toBe(false);
  });

  it("既に上がったプレイヤーはカードを出せない", () => {
    const state: SonicRestaurantState = {
      ...makePlayingState({ [P1]: ["ラー"], [P2]: ["チャー"] }),
      finishedOrder: [P1], // P1は既に上がっている
    };
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1)
    ).toBe(false);
  });

  it("「とりけし」はルートでも出せる（常に有効）", () => {
    const state = makePlayingState({ [P1]: ["とりけし"], [P2]: ["チャー"] });
    expect(
      sonicRestaurantGame.validateMove(state, { type: "play-card", card: "とりけし", handIndex: 0 }, P1)
    ).toBe(true);
  });
});

describe("applyMove - countdown-complete", () => {
  it("countdown-completeでplayingフェーズに移行する", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    const newState = sonicRestaurantGame.applyMove(state, { type: "countdown-complete" }, P1);
    expect(newState.phase).toBe("playing");
  });
});

describe("applyMove - play-card", () => {
  it("カードを出すと手札から削除される", () => {
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    const newState = sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    expect(newState.hands[P1]).toHaveLength(1);
    expect(newState.hands[P1]).not.toContain("ラー");
    expect(newState.hands[P1]).toContain("メン");
  });

  it("カードを出すとcurrentPathに追加される", () => {
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    const newState = sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    expect(newState.currentPath).toEqual(["ラー"]);
  });

  it("メニューが完成するとcurrentPathがリセットされてlastCompletedMenuが設定される", () => {
    // ラーメン: ["ラー", "メン"]
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    const state2 = sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    const state3 = sonicRestaurantGame.applyMove(state2, { type: "play-card", card: "メン", handIndex: 0 }, P1);
    expect(state3.currentPath).toEqual([]); // リセット
    expect(state3.lastCompletedMenu).not.toBeNull();
    expect(state3.lastCompletedMenu!.name).toBe("ラーメン");
  });

  it("手札が0になったらfinishedOrderに追加される", () => {
    // P1の最後のカードでメニュー完成
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー", "シュー", "メン"] });
    const state2 = sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    const state3 = sonicRestaurantGame.applyMove(state2, { type: "play-card", card: "メン", handIndex: 0 }, P1);
    expect(state3.finishedOrder).toContain(P1);
  });

  it("「とりけし」を出すとcurrentPathがリセットされる", () => {
    const state = makePlayingState({ [P1]: ["ラー", "とりけし"], [P2]: ["チャー"] });
    const state2 = sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    expect(state2.currentPath).toEqual(["ラー"]);

    const state3 = sonicRestaurantGame.applyMove(state2, { type: "play-card", card: "とりけし", handIndex: 0 }, P1);
    expect(state3.currentPath).toEqual([]); // リセット
  });

  it("元のstateを変更しない（不変性）", () => {
    const state = makePlayingState({ [P1]: ["ラー", "メン"], [P2]: ["チャー"] });
    const origHand = [...state.hands[P1]];
    sonicRestaurantGame.applyMove(state, { type: "play-card", card: "ラー", handIndex: 0 }, P1);
    expect(state.hands[P1]).toEqual(origHand); // 元の手札は変わらない
  });
});

describe("getStatus", () => {
  it("finished=falseかつ誰でも出せるカードがある場合は'playing'", () => {
    const state = makePlayingState({ [P1]: ["ラー"], [P2]: ["チャー"] });
    expect(sonicRestaurantGame.getStatus(state)).toBe("playing");
  });

  it("残りプレイヤーが1人になると'finished'", () => {
    const state: SonicRestaurantState = {
      ...makePlayingState({ [P1]: ["ラー"], [P2]: ["チャー"] }),
      finishedOrder: [P1], // P1は上がった
    };
    // P2だけ残り → finished
    expect(sonicRestaurantGame.getStatus(state)).toBe("finished");
  });
});

describe("getRanking", () => {
  it("finishedOrderの順番で順位が決まる", () => {
    const state: SonicRestaurantState = {
      ...makePlayingState({ [P1]: [], [P2]: ["チャー"] }),
      finishedOrder: [P1], // P1が先に上がった
    };
    const ranking = sonicRestaurantGame.getRanking(state);
    expect(ranking![0]).toBe(P1); // 1位
  });

  it("残りプレイヤーは手札枚数の少ない順", () => {
    // P1が上がり済み、P2が1枚、P3が3枚
    const state: SonicRestaurantState = {
      ...makePlayingState({ [P1]: [], [P2]: ["チャー"], [P3]: ["ラー", "メン", "チャー"] }),
      playerIds: [P1, P2, P3],
      finishedOrder: [P1],
    };
    const ranking = sonicRestaurantGame.getRanking(state);
    expect(ranking![0]).toBe(P1); // 1位（上がり済み）
    expect(ranking![1]).toBe(P2); // 2位（1枚）
    expect(ranking![2]).toBe(P3); // 3位（3枚）
  });
});

describe("getCurrentPlayerId", () => {
  it("空文字を返す（非ターン制ゲーム）", () => {
    const state = sonicRestaurantGame.createInitialState([P1, P2]);
    expect(sonicRestaurantGame.getCurrentPlayerId(state)).toBe("");
  });
});
