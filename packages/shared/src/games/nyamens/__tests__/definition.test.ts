import { afterEach, describe, expect, it, vi } from "vitest";
import { nyaMensDefinition } from "../definition.js";
import type { NyaMensState, NyaMensTrack } from "../types.js";

const P1 = "p1";
const P2 = "p2";

const makeShiroState = (targetHand: number[], track: NyaMensTrack): NyaMensState => ({
  phase: "event-shirokuma",
  playerOrder: [P1, P2],
  handSize: 4,
  roles: { [P1]: "nyamens", [P2]: "nyamens" },
  hands: { [P1]: [20, 25, 27, 28], [P2]: targetHand },
  drawPile: [],
  burnedCards: [],
  track,
  repairDutyIndex: 0,
  diceResult: null,
  okamiActive: false,
  selectedCards: {},
  revealedCards: null,
  eventQueue: [],
  readyPlayers: [],
  votes: null,
  shirokuma: {},
});

const stuckTrack: NyaMensTrack = { up: [30], recycleBox: 15, down: [1] };

describe("event-shirokuma: 詰みカード選択時 → vote フェーズ移行", () => {
  it("シロクマが詰みカードを選んだとき vote フェーズに移行し、そのカードが revealedCards に残る", () => {
    // target の手札が [10] のみ → ランダム性排除
    const state = makeShiroState([10], stuckTrack);
    const next = nyaMensDefinition.applyMove(
      state,
      { type: "shirokuma-target", playerId: P2 },
      P1
    );
    expect(next.phase).toBe("vote");
    expect(next.votes).toEqual({});
    expect(next.revealedCards).toEqual([10]);
  });
});

describe("event-shirokuma: 配置可能カード選択時 → repair フェーズ移行", () => {
  it("シロクマが配置可能カードを選んだとき repair フェーズに移行する", () => {
    // target の手札が [35] のみ → 35 > 30 (up) で置ける
    const state = makeShiroState([35], stuckTrack);
    const next = nyaMensDefinition.applyMove(
      state,
      { type: "shirokuma-target", playerId: P2 },
      P1
    );
    expect(next.phase).toBe("repair");
    expect(next.revealedCards).toEqual([35]);
  });
});

describe("repair: 残カードが詰む → vote フェーズ移行", () => {
  it("repair 中に残カードが詰んだとき vote フェーズに移行する", () => {
    // revealedCards: [35, 10], track: up=[30], recycleBox=15, down=[1]
    // カード 35 を up に置くと track.up=[30,35]、残り [10] は全置き場不可
    const state: NyaMensState = {
      ...makeShiroState([], stuckTrack),
      phase: "repair",
      revealedCards: [35, 10],
    };
    const next = nyaMensDefinition.applyMove(
      state,
      { type: "place-card", card: 35, destination: "up" },
      P1
    );
    expect(next.phase).toBe("vote");
    expect(next.votes).toEqual({});
  });
});

describe("repair: 全詰み状態での防御チェック（セーフガード）", () => {
  it("repair フェーズで全詰み状態のとき次の手で vote に移行する", () => {
    // revealedCards: [10], track: up=[30], recycleBox=15, down=[1] → 全詰み
    // applyMove を直接呼び出してセーフガードを確認
    const state: NyaMensState = {
      ...makeShiroState([], stuckTrack),
      phase: "repair",
      revealedCards: [10],
    };
    // validateMove は通らないが applyMove を直接呼ぶ（セーフガードの確認）
    const next = nyaMensDefinition.applyMove(
      state,
      { type: "place-card", card: 10, destination: "up" },
      P1
    );
    expect(next.phase).toBe("vote");
    expect(next.votes).toEqual({});
  });
});
// ---------------------------------------------------------------------------
// draw-cards フェーズ
// ---------------------------------------------------------------------------

const makeDrawState = (overrides: Partial<NyaMensState> = {}): NyaMensState => ({
  phase: "draw-cards",
  playerOrder: [P1, P2],
  handSize: 3,
  roles: { [P1]: "nyamens", [P2]: "nyamens" },
  hands: { [P1]: [1, 2], [P2]: [4, 5, 6] },
  drawPile: [10, 11, 12],
  burnedCards: [],
  track: { up: [], down: [], recycleBox: null },
  repairDutyIndex: 0,
  diceResult: null,
  okamiActive: false,
  selectedCards: {},
  revealedCards: null,
  eventQueue: [],
  readyPlayers: [],
  votes: null,
  drawQueue: [P1],
  drawnCard: null,
  lastDrawer: undefined,
  ...overrides,
});

describe("draw-cards: 通常補充", () => {
  it("P1 が draw-card を送ると手札が 1 枚増え、handSize に達したらキューから外れる", () => {
    // P1: [1,2] → 1枚引くと [1,2,10] = handSize(3) → キューから外れる
    const state = makeDrawState();
    const next = nyaMensDefinition.applyMove(state, { type: "draw-card" }, P1);
    expect(next.hands[P1]).toHaveLength(3);
    expect(next.drawnCard).toBe(10);
    expect(next.lastDrawer).toBe(P1);
    // handSize に達したのでキューから外れ drawQueue は空に
    expect(next.drawQueue).toHaveLength(0);
  });

  it("handSize に達していないときはキューに残り続ける", () => {
    // P1: [1] → 1枚引くと [1,10] = 2枚 < handSize(3) → キューに残る
    const state = makeDrawState({ hands: { [P1]: [1], [P2]: [4, 5, 6] } });
    const next = nyaMensDefinition.applyMove(state, { type: "draw-card" }, P1);
    expect(next.hands[P1]).toHaveLength(2);
    expect(next.drawQueue).toContain(P1);
  });
});

describe("draw-cards: ACK 待ち状態", () => {
  it("drawQueue 空 + drawnCard あり + lastDrawer 一致 → validateMove が true を返す", () => {
    const state = makeDrawState({ drawQueue: [], drawnCard: 10, lastDrawer: P1 });
    expect(nyaMensDefinition.validateMove(state, { type: "draw-card" }, P1)).toBe(true);
  });

  it("drawQueue 空 + drawnCard あり + lastDrawer 不一致 → validateMove が false を返す", () => {
    const state = makeDrawState({ drawQueue: [], drawnCard: 10, lastDrawer: P1 });
    expect(nyaMensDefinition.validateMove(state, { type: "draw-card" }, P2)).toBe(false);
  });

  it("ACK を受けると processNextEvent が呼ばれ dice-roll に遷移する", () => {
    const state = makeDrawState({
      drawQueue: [],
      drawnCard: 10,
      lastDrawer: P1,
      hands: { [P1]: [1, 2, 3], [P2]: [4, 5, 6] }, // 全員 handSize 充足
    });
    const next = nyaMensDefinition.applyMove(state, { type: "draw-card" }, P1);
    expect(next.phase).toBe("dice-roll");
    expect(next.drawnCard).toBeUndefined();
    expect(next.lastDrawer).toBeUndefined();
  });
});

describe("draw-cards: 山札が空のときスキップ", () => {
  it("山札空で draw-card を送ると drawnCard/lastDrawer をクリアして次へ進む", () => {
    const state = makeDrawState({ drawPile: [], drawQueue: [P1, P2] });
    const next = nyaMensDefinition.applyMove(state, { type: "draw-card" }, P1);
    // P1 がスキップされて P2 の番になる
    expect(next.drawnCard).toBeUndefined();
    expect(next.lastDrawer).toBeUndefined();
    expect(next.drawQueue).toEqual([P2]);
  });

  it("最後の 1 人が山札空でスキップされると processNextEvent を経て dice-roll に遷移する", () => {
    const state = makeDrawState({ drawPile: [], drawQueue: [P1] });
    const next = nyaMensDefinition.applyMove(state, { type: "draw-card" }, P1);
    expect(next.phase).toBe("dice-roll");
  });
});

// ---------------------------------------------------------------------------
// card-selection: 全手札合計がサイコロ結果より少ない場合
// ---------------------------------------------------------------------------

describe("card-selection: 全手札合計 < diceResult", () => {
  it("全手札 3 枚でサイコロ 5 → 3 枚選択で confirm-submission が通る", () => {
    const state: NyaMensState = {
      ...makeDrawState({ phase: "card-selection" }),
      hands: { [P1]: [1, 2], [P2]: [3] }, // 合計 3 枚
      diceResult: 5,
      selectedCards: { [P1]: [1, 2], [P2]: [3] }, // 全手札選択
    };
    expect(nyaMensDefinition.validateMove(state, { type: "confirm-submission" }, P1)).toBe(true);
  });

  it("全手札 3 枚でサイコロ 5 のとき 2 枚しか選択しないと confirm-submission が通らない", () => {
    const state: NyaMensState = {
      ...makeDrawState({ phase: "card-selection" }),
      hands: { [P1]: [1, 2], [P2]: [3] },
      diceResult: 5,
      selectedCards: { [P1]: [1, 2] }, // 2 枚のみ選択
    };
    expect(nyaMensDefinition.validateMove(state, { type: "confirm-submission" }, P1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// roll 1/6: リサイクルボックスが空のとき draw-cards フェーズへ
// ---------------------------------------------------------------------------

afterEach(() => vi.restoreAllMocks());

describe("dice-roll roll=1: リサイクルボックス空 → draw-cards フェーズ", () => {
  it("recycleBox=null でロール 1 → 当番プレイヤーが drawQueue に追加される", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // → roll = 1
    const state: NyaMensState = {
      ...makeDrawState({ phase: "dice-roll" }),
      hands: { [P1]: [1, 2, 3], [P2]: [4, 5, 6] }, // 全員 handSize 充足
      drawPile: [10],
      track: { up: [], down: [], recycleBox: null },
    };
    const next = nyaMensDefinition.applyMove(state, { type: "roll-dice" }, P1);
    expect(next.phase).toBe("draw-cards");
    expect(next.drawQueue).toContain(P1); // 当番プレイヤーが強制追加
    expect(next.diceResult).toBe(1); // diceResult 保持
  });

  it("recycleBox=null + 山札も空 → draw-cards をスキップして dice-roll へ", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state: NyaMensState = {
      ...makeDrawState({ phase: "dice-roll" }),
      drawPile: [],
      track: { up: [], down: [], recycleBox: null },
    };
    const next = nyaMensDefinition.applyMove(state, { type: "roll-dice" }, P1);
    expect(next.phase).toBe("dice-roll"); // スキップして次ターンへ
  });

  it("recycleBox あり でロール 1 → カードが焼却されて enterDrawPhase へ", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state: NyaMensState = {
      ...makeDrawState({ phase: "dice-roll" }),
      track: { up: [], down: [], recycleBox: 15 },
    };
    const next = nyaMensDefinition.applyMove(state, { type: "roll-dice" }, P1);
    expect(next.burnedCards).toContain(15);
    expect(next.track.recycleBox).toBeNull();
  });
});

describe("dice-roll roll=6: リサイクルボックス空 → draw-cards フェーズ", () => {
  it("recycleBox=null でロール 6 → 当番プレイヤーが drawQueue に追加される", () => {
    vi.spyOn(Math, "random").mockReturnValue(5 / 6); // floor(5/6*6)=5 → +1 = 6
    const state: NyaMensState = {
      ...makeDrawState({ phase: "dice-roll" }),
      hands: { [P1]: [1, 2, 3], [P2]: [4, 5, 6] },
      drawPile: [10],
      track: { up: [], down: [], recycleBox: null },
    };
    const next = nyaMensDefinition.applyMove(state, { type: "roll-dice" }, P1);
    expect(next.phase).toBe("draw-cards");
    expect(next.drawQueue).toContain(P1);
    expect(next.diceResult).toBe(6);
  });

  it("recycleBox あり でロール 6 → リサイクルカードが当番の手札に加わる", () => {
    vi.spyOn(Math, "random").mockReturnValue(5 / 6);
    const state: NyaMensState = {
      ...makeDrawState({ phase: "dice-roll" }),
      hands: { [P1]: [1, 2], [P2]: [4, 5, 6] },
      track: { up: [], down: [], recycleBox: 15 },
    };
    const next = nyaMensDefinition.applyMove(state, { type: "roll-dice" }, P1);
    expect(next.hands[P1]).toContain(15);
    expect(next.track.recycleBox).toBeNull();
  });
});