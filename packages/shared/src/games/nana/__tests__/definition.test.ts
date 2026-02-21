import { describe, expect, it } from "vitest";
import { nanaDefinition } from "../definition.js";
import type { NanaCard, NanaState } from "../types.js";

const P1 = "player1";
const P2 = "player2";
const P3 = "player3";

const card = (id: number, number: number): NanaCard => ({ id, number });

function makeState(overrides: Partial<NanaState> = {}): NanaState {
  return {
    playerIds: [P1, P2],
    currentPlayerIndex: 0,
    fieldCards: [],
    hands: { [P1]: [], [P2]: [] },
    turnFlips: [],
    pendingResult: null,
    collectedSets: { [P1]: [], [P2]: [] },
    winnerId: null,
    finished: false,
    ...overrides,
  };
}

// ---- createInitialState ----

describe("createInitialState", () => {
  it("2人: 手札10枚、場札10枚", () => {
    const state = nanaDefinition.createInitialState([P1, P2]);
    expect(state.hands[P1]).toHaveLength(10);
    expect(state.hands[P2]).toHaveLength(10);
    expect(state.fieldCards.filter(Boolean)).toHaveLength(10);
  });

  it("3人: 手札8枚、場札9枚（余りなし）", () => {
    const state = nanaDefinition.createInitialState([P1, P2, P3]);
    for (const pid of [P1, P2, P3]) {
      expect(state.hands[pid]).toHaveLength(8);
    }
    expect(state.fieldCards.filter(Boolean)).toHaveLength(9);
  });

  it("4人: 手札7枚、場札8枚", () => {
    const p4 = "player4";
    const state = nanaDefinition.createInitialState([P1, P2, P3, p4]);
    for (const pid of [P1, P2, P3, p4]) {
      expect(state.hands[pid]).toHaveLength(7);
    }
    expect(state.fieldCards.filter(Boolean)).toHaveLength(8);
  });

  it("5人: 手札6枚、場札6枚", () => {
    const p4 = "player4";
    const p5 = "player5";
    const state = nanaDefinition.createInitialState([P1, P2, P3, p4, p5]);
    for (const pid of [P1, P2, P3, p4, p5]) {
      expect(state.hands[pid]).toHaveLength(6);
    }
    expect(state.fieldCards.filter(Boolean)).toHaveLength(6);
  });

  it("各プレイヤーの手札は昇順ソートされている", () => {
    const state = nanaDefinition.createInitialState([P1, P2]);
    for (const hand of Object.values(state.hands)) {
      for (let i = 0; i < hand.length - 1; i++) {
        expect(hand[i].number).toBeLessThanOrEqual(hand[i + 1].number);
      }
    }
  });

  it("currentPlayerIndex=0 で開始", () => {
    const state = nanaDefinition.createInitialState([P1, P2]);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("turnFlips は空", () => {
    const state = nanaDefinition.createInitialState([P1, P2]);
    expect(state.turnFlips).toHaveLength(0);
  });

  it("finished=false で開始", () => {
    const state = nanaDefinition.createInitialState([P1, P2]);
    expect(state.finished).toBe(false);
  });
});

// ---- parseMove ----

describe("parseMove", () => {
  const parse = nanaDefinition.parseMove!.bind(nanaDefinition);

  it("flip-field: 有効な入力", () => {
    expect(parse({ type: "flip-field", fieldIndex: 3 })).toEqual({
      type: "flip-field",
      fieldIndex: 3,
    });
  });

  it("flip-field: fieldIndex が 0 でも有効", () => {
    expect(parse({ type: "flip-field", fieldIndex: 0 })).toEqual({
      type: "flip-field",
      fieldIndex: 0,
    });
  });

  it("flip-field: fieldIndex が非整数は null", () => {
    expect(parse({ type: "flip-field", fieldIndex: 1.5 })).toBeNull();
  });

  it("flip-field: fieldIndex が負数は null", () => {
    expect(parse({ type: "flip-field", fieldIndex: -1 })).toBeNull();
  });

  it("flip-field: fieldIndex が文字列は null", () => {
    expect(parse({ type: "flip-field", fieldIndex: "0" })).toBeNull();
  });

  it("flip-hand: max", () => {
    expect(
      parse({ type: "flip-hand", targetPlayerId: P2, position: "max" }),
    ).toEqual({ type: "flip-hand", targetPlayerId: P2, position: "max" });
  });

  it("flip-hand: min", () => {
    expect(
      parse({ type: "flip-hand", targetPlayerId: P2, position: "min" }),
    ).toEqual({ type: "flip-hand", targetPlayerId: P2, position: "min" });
  });

  it("flip-hand: targetPlayerId が非文字列は null", () => {
    expect(parse({ type: "flip-hand", targetPlayerId: 123, position: "max" })).toBeNull();
  });

  it("flip-hand: position が不正は null", () => {
    expect(
      parse({ type: "flip-hand", targetPlayerId: P2, position: "middle" }),
    ).toBeNull();
  });

  it("不明な type は null", () => {
    expect(parse({ type: "unknown" })).toBeNull();
  });

  it("null は null", () => {
    expect(parse(null)).toBeNull();
  });

  it("文字列は null", () => {
    expect(parse("flip-field")).toBeNull();
  });
});

// ---- validateMove ----

describe("validateMove", () => {
  it("手番プレイヤーが有効な場札をめくれる", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 3)],
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        P1,
      ),
    ).toBe(true);
  });

  it("手番外プレイヤーはめくれない", () => {
    const state = makeState({
      fieldCards: [card(0, 5)],
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        P2,
      ),
    ).toBe(false);
  });

  it("存在しないプレイヤーはめくれない", () => {
    const state = makeState({ fieldCards: [card(0, 5)] });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        "unknown",
      ),
    ).toBe(false);
  });

  it("finished=true では誰もめくれない", () => {
    const state = makeState({
      fieldCards: [card(0, 5)],
      finished: true,
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        P1,
      ),
    ).toBe(false);
  });

  it("null スロット（取得済み）はめくれない", () => {
    const state = makeState({ fieldCards: [null, card(1, 3)] });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        P1,
      ),
    ).toBe(false);
  });

  it("範囲外インデックスはめくれない", () => {
    const state = makeState({ fieldCards: [card(0, 5)] });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 5 },
        P1,
      ),
    ).toBe(false);
  });

  it("今ターン既にめくったカードは再度めくれない", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5)],
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-field", fieldIndex: 0 },
        P1,
      ),
    ).toBe(false);
  });

  it("手札の max をめくれる", () => {
    const state = makeState({
      hands: { [P1]: [card(10, 2), card(11, 6)], [P2]: [] },
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-hand", targetPlayerId: P1, position: "max" },
        P1,
      ),
    ).toBe(true);
  });

  it("手札の min をめくれる（他プレイヤー含む）", () => {
    const state = makeState({
      hands: { [P1]: [], [P2]: [card(10, 3), card(11, 9)] },
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-hand", targetPlayerId: P2, position: "min" },
        P1,
      ),
    ).toBe(true);
  });

  it("手札が空のプレイヤーの max/min はめくれない", () => {
    const state = makeState({
      hands: { [P1]: [], [P2]: [] },
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-hand", targetPlayerId: P2, position: "max" },
        P1,
      ),
    ).toBe(false);
  });

  it("手札が全て既にめくられているとき flip-hand は無効", () => {
    const state = makeState({
      hands: { [P1]: [], [P2]: [card(10, 5)] },
      turnFlips: [{ cardId: 10, source: { type: "hand", targetPlayerId: P2, position: "max" } }],
      fieldCards: [card(0, 5), card(1, 5)], // fieldCards[0]が既にめくられていると仮定
    });
    expect(
      nanaDefinition.validateMove(
        state,
        { type: "flip-hand", targetPlayerId: P2, position: "max" },
        P1,
      ),
    ).toBe(false);
  });
});

// ---- applyMove ----

describe("applyMove - 1枚目", () => {
  it("場札をめくると turnFlips に追加される", () => {
    const state = makeState({ fieldCards: [card(0, 5), card(1, 3)] });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 0 },
      P1,
    );
    expect(next.turnFlips).toHaveLength(1);
    expect(next.turnFlips[0].cardId).toBe(0);
    expect(next.turnFlips[0].source).toEqual({ type: "field", index: 0 });
  });

  it("手札の max をめくると turnFlips に追加される", () => {
    const state = makeState({
      hands: { [P1]: [], [P2]: [card(10, 3), card(11, 7)] },
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-hand", targetPlayerId: P2, position: "max" },
      P1,
    );
    expect(next.turnFlips).toHaveLength(1);
    expect(next.turnFlips[0].cardId).toBe(11);
  });

  it("1枚目のめくりで currentPlayerIndex は変わらない", () => {
    const state = makeState({ fieldCards: [card(0, 5)] });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 0 },
      P1,
    );
    expect(next.currentPlayerIndex).toBe(0);
  });
});

describe("applyMove - 2枚目", () => {
  it("2枚目が同じ数字なら継続（turnFlips が 2 になる）", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5)],
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 1 },
      P1,
    );
    expect(next.turnFlips).toHaveLength(2);
    expect(next.currentPlayerIndex).toBe(0);
  });

  it("2枚目が異なる数字なら失敗確認待ちになる", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 3)],
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 1 },
      P1,
    );
    expect(next.turnFlips).toHaveLength(2);
    expect(next.pendingResult).toBe("failure");
    expect(next.currentPlayerIndex).toBe(0);
  });

  it("失敗しても場札はそのまま残る（取られない）", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 3)],
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 1 },
      P1,
    );
    expect(next.fieldCards[0]).not.toBeNull();
    expect(next.fieldCards[1]).not.toBeNull();
  });
});

describe("applyMove - 3枚目（成功）", () => {
  it("3枚全て同じ数字で成功確認待ちになる", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5), card(2, 5)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    expect(next.collectedSets[P1]).toEqual([]);
    expect(next.turnFlips).toHaveLength(3);
    expect(next.pendingResult).toBe("success");
  });

  it("confirm後にセット取得し、該当場札スロットが null になる", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5), card(2, 5)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.fieldCards[0]).toBeNull();
    expect(next.fieldCards[1]).toBeNull();
    expect(next.fieldCards[2]).toBeNull();
  });

  it("confirm後に手札を含むセット取得で手札からも削除される", () => {
    const state = makeState({
      fieldCards: [card(2, 5)],
      hands: {
        [P1]: [card(0, 5)],
        [P2]: [card(1, 5)],
      },
      turnFlips: [
        { cardId: 0, source: { type: "hand", targetPlayerId: P1, position: "min" } },
        { cardId: 1, source: { type: "hand", targetPlayerId: P2, position: "min" } },
      ],
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 0 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.hands[P1]).toHaveLength(0);
    expect(next.hands[P2]).toHaveLength(0);
    expect(next.fieldCards[0]).toBeNull();
    expect(next.collectedSets[P1]).toEqual([5]);
  });

  it("confirm後、ターンは次のプレイヤーへ進む（勝利していない場合）", () => {
    const state = makeState({
      fieldCards: [card(0, 3), card(1, 3), card(2, 3)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.finished).toBe(false);
  });
});

describe("applyMove - 3枚目（失敗）", () => {
  it("3枚目が異なる数字なら失敗確認待ちになる", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5), card(2, 9)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    expect(next.turnFlips).toHaveLength(3);
    expect(next.pendingResult).toBe("failure");
    expect(next.currentPlayerIndex).toBe(0);
    expect(next.collectedSets[P1]).toHaveLength(0);
  });

  it("3枚目失敗でも場札は残る", () => {
    const state = makeState({
      fieldCards: [card(0, 5), card(1, 5), card(2, 9)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
    });
    const next = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    expect(next.fieldCards[0]).not.toBeNull();
    expect(next.fieldCards[1]).not.toBeNull();
    expect(next.fieldCards[2]).not.toBeNull();
  });
});

describe("applyMove - 勝利条件", () => {
  it("条件3: 7のセットを取ってconfirmすると勝利", () => {
    const state = makeState({
      fieldCards: [card(0, 7), card(1, 7), card(2, 7)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
      collectedSets: { [P1]: [], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.finished).toBe(true);
    expect(next.winnerId).toBe(P1);
  });

  it("条件2: 5のセット取得後、2のセットを取ってconfirmすると 5+2=7 で勝利", () => {
    const state = makeState({
      fieldCards: [card(0, 2), card(1, 2), card(2, 2)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
      collectedSets: { [P1]: [5], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.finished).toBe(true);
    expect(next.winnerId).toBe(P1);
    expect(next.collectedSets[P1]).toEqual([5, 2]);
  });

  it("条件2: 差が7: 1のセット保持中に8のセットを取ってconfirmすると勝利", () => {
    const state = makeState({
      fieldCards: [card(0, 8), card(1, 8), card(2, 8)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
      collectedSets: { [P1]: [1], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.finished).toBe(true);
    expect(next.winnerId).toBe(P1);
  });

  it("条件1: 3つ目のセットを取ってconfirmすると勝利", () => {
    const state = makeState({
      fieldCards: [card(0, 1), card(1, 1), card(2, 1)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
      collectedSets: { [P1]: [3, 9], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.finished).toBe(true);
    expect(next.winnerId).toBe(P1);
    expect(next.collectedSets[P1]).toEqual([3, 9, 1]);
  });

  it("勝利していないセット取得でもconfirm後は finished=false のまま", () => {
    const state = makeState({
      fieldCards: [card(0, 3), card(1, 3), card(2, 3)],
      turnFlips: [
        { cardId: 0, source: { type: "field", index: 0 } },
        { cardId: 1, source: { type: "field", index: 1 } },
      ],
      collectedSets: { [P1]: [], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 2 },
      P1,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P1);
    expect(next.finished).toBe(false);
    expect(next.winnerId).toBeNull();
  });
});

describe("applyMove - ターン進行の周回", () => {
  it("最後のプレイヤーのターン失敗をconfirmすると index=0 に戻る", () => {
    const state = makeState({
      playerIds: [P1, P2],
      currentPlayerIndex: 1,
      fieldCards: [card(0, 4), card(1, 2)],
      hands: { [P1]: [], [P2]: [] },
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
      collectedSets: { [P1]: [], [P2]: [] },
    });
    const pending = nanaDefinition.applyMove(
      state,
      { type: "flip-field", fieldIndex: 1 },
      P2,
    );
    const next = nanaDefinition.applyMove(pending, { type: "confirm" }, P2);
    expect(next.currentPlayerIndex).toBe(0); // 失敗: index=1+1=0（2人）
  });
});

// ---- getStatus ----

describe("getStatus", () => {
  it("finished=false なら 'playing'", () => {
    expect(nanaDefinition.getStatus(makeState({ finished: false }))).toBe(
      "playing",
    );
  });

  it("finished=true なら 'finished'", () => {
    expect(nanaDefinition.getStatus(makeState({ finished: true }))).toBe(
      "finished",
    );
  });
});

// ---- getRanking ----

describe("getRanking", () => {
  it("未終了では null", () => {
    expect(nanaDefinition.getRanking(makeState({ finished: false }))).toBeNull();
  });

  it("winnerId がない finished 状態では null", () => {
    expect(
      nanaDefinition.getRanking(makeState({ finished: true, winnerId: null })),
    ).toBeNull();
  });

  it("勝者が先頭に来る", () => {
    const state = makeState({ finished: true, winnerId: P1 });
    const ranking = nanaDefinition.getRanking(state)!;
    expect(ranking[0]).toBe(P1);
    expect(ranking).toContain(P2);
  });

  it("P2 が勝利した場合、P2 が先頭", () => {
    const state = makeState({ finished: true, winnerId: P2 });
    const ranking = nanaDefinition.getRanking(state)!;
    expect(ranking[0]).toBe(P2);
    expect(ranking[1]).toBe(P1);
  });
});

// ---- getCurrentPlayerId ----

describe("getCurrentPlayerId", () => {
  it("index=0 のとき P1 を返す", () => {
    expect(
      nanaDefinition.getCurrentPlayerId(
        makeState({ currentPlayerIndex: 0 }),
      ),
    ).toBe(P1);
  });

  it("index=1 のとき P2 を返す", () => {
    expect(
      nanaDefinition.getCurrentPlayerId(
        makeState({ currentPlayerIndex: 1 }),
      ),
    ).toBe(P2);
  });
});

// ---- getPlayerView ----

describe("getPlayerView", () => {
  it("自分の手札の数字は常に見える", () => {
    const state = makeState({
      hands: {
        [P1]: [card(0, 3), card(1, 7)],
        [P2]: [card(2, 5)],
      },
    });
    const view = nanaDefinition.getPlayerView!(state, P1) as {
      hands: Record<string, { id: number; number: number | null }[]>;
    };
    expect(view.hands[P1][0].number).toBe(3);
    expect(view.hands[P1][1].number).toBe(7);
  });

  it("他のプレイヤーの手札は通常非公開（number=null）", () => {
    const state = makeState({
      hands: {
        [P1]: [card(0, 3)],
        [P2]: [card(2, 5)],
      },
    });
    const view = nanaDefinition.getPlayerView!(state, P1) as {
      hands: Record<string, { id: number; number: number | null }[]>;
    };
    expect(view.hands[P2][0].number).toBeNull();
  });

  it("今ターンめくり中のカードは全員に公開（number が見える）", () => {
    const state = makeState({
      fieldCards: [card(0, 8)],
      hands: {
        [P1]: [],
        [P2]: [],
      },
      turnFlips: [{ cardId: 0, source: { type: "field", index: 0 } }],
    });
    // P2 視点でも field card の数字が見える
    const view = nanaDefinition.getPlayerView!(state, P2) as {
      fieldCards: ({ id: number; number: number | null } | null)[];
    };
    expect(view.fieldCards[0]?.number).toBe(8);
  });

  it("今ターンめくり中の他プレイヤー手札も全員に公開", () => {
    const state = makeState({
      fieldCards: [],
      hands: {
        [P1]: [],
        [P2]: [card(5, 9)],
      },
      turnFlips: [
        { cardId: 5, source: { type: "hand", targetPlayerId: P2, position: "max" } },
      ],
    });
    const view = nanaDefinition.getPlayerView!(state, P1) as {
      hands: Record<string, { id: number; number: number | null }[]>;
    };
    expect(view.hands[P2][0].number).toBe(9);
  });

  it("場札の未公開カードは number=null", () => {
    const state = makeState({
      fieldCards: [card(0, 4), null],
      hands: { [P1]: [], [P2]: [] },
    });
    const view = nanaDefinition.getPlayerView!(state, P1) as {
      fieldCards: ({ id: number; number: number | null } | null)[];
    };
    expect(view.fieldCards[0]?.number).toBeNull();
  });

  it("取得済みスロット（null）はそのまま null", () => {
    const state = makeState({
      fieldCards: [null],
      hands: { [P1]: [], [P2]: [] },
    });
    const view = nanaDefinition.getPlayerView!(state, P1) as {
      fieldCards: ({ id: number; number: number | null } | null)[];
    };
    expect(view.fieldCards[0]).toBeNull();
  });

  it("カードの id は常に公開される", () => {
    const state = makeState({
      fieldCards: [card(99, 6)],
      hands: { [P1]: [], [P2]: [] },
    });
    const view = nanaDefinition.getPlayerView!(state, P2) as {
      fieldCards: ({ id: number; number: number | null } | null)[];
    };
    expect(view.fieldCards[0]?.id).toBe(99);
  });
});
