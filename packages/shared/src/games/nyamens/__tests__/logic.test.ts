import { describe, expect, it } from "vitest";
import { checkVoteResult, enterDrawPhase, processNextEvent } from "../logic.js";
import type { NyaMensState } from "../types.js";

const P1 = "p1";
const P2 = "p2";
const P3 = "p3";

/** draw-cards フェーズ以外で使うベースステート */
function makeBase(overrides: Partial<NyaMensState> = {}): NyaMensState {
  return {
    phase: "dice-roll",
    playerOrder: [P1, P2],
    handSize: 3,
    roles: { [P1]: "nyamens", [P2]: "nyamens" },
    hands: { [P1]: [1, 2, 3], [P2]: [4, 5, 6] },
    drawPile: [7, 8, 9, 10],
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// enterDrawPhase
// ---------------------------------------------------------------------------

describe("enterDrawPhase: 全員 handSize 以上 → dice-roll へスキップ", () => {
  it("補充不要のとき processNextEvent を経由して dice-roll に遷移する", () => {
    const state = makeBase(); // P1=[1,2,3], P2=[4,5,6], handSize=3
    const next = enterDrawPhase(state);
    expect(next.phase).toBe("dice-roll");
    expect(next.repairDutyIndex).toBe(1); // ローテート済み
  });
});

describe("enterDrawPhase: 山札が空 → dice-roll へスキップ", () => {
  it("山札が空なら補充不要でも draw-cards を経ず dice-roll に遷移する", () => {
    const state = makeBase({
      drawPile: [],
      hands: { [P1]: [1, 2], [P2]: [4, 5, 6] }, // P1 手札不足だが山札ゼロ
    });
    const next = enterDrawPhase(state);
    expect(next.phase).toBe("dice-roll");
  });
});

describe("enterDrawPhase: 補充が必要 → draw-cards フェーズ", () => {
  it("手札不足のプレイヤーが drawQueue に入る", () => {
    const state = makeBase({
      hands: { [P1]: [1], [P2]: [4, 5, 6] }, // P1 が 1 枚不足
    });
    const next = enterDrawPhase(state);
    expect(next.phase).toBe("draw-cards");
    expect(next.drawQueue).toEqual([P1]);
    expect(next.drawnCard).toBeNull();
  });

  it("複数プレイヤーが手札不足なら全員がキューに入る", () => {
    const state = makeBase({
      hands: { [P1]: [1], [P2]: [4] }, // 両者 1 枚不足
    });
    const next = enterDrawPhase(state);
    expect(next.phase).toBe("draw-cards");
    expect(next.drawQueue).toEqual([P1, P2]);
  });
});

// ---------------------------------------------------------------------------
// processNextEvent: 全カード消費 → ニャーメンズ勝利
// ---------------------------------------------------------------------------

describe("processNextEvent: 全手札＋山札ゼロ → ニャーメンズ勝利", () => {
  it("手札も山札もゼロのとき finished になりニャーメンズが勝つ", () => {
    const state = makeBase({
      hands: { [P1]: [], [P2]: [] },
      drawPile: [],
      eventQueue: [],
    });
    const next = processNextEvent(state);
    expect(next.phase).toBe("finished");
    expect(next.result?.winner).toBe("nyamens");
    expect(next.result?.reason).toBe("repair-complete");
  });

  it("手札があるときは通常通り dice-roll に遷移する", () => {
    const state = makeBase({
      hands: { [P1]: [1], [P2]: [] },
      drawPile: [],
      eventQueue: [],
    });
    const next = processNextEvent(state);
    expect(next.phase).toBe("dice-roll");
  });
});

describe("processNextEvent: イベントキュー処理", () => {
  it("okami イベントで okamiActive が true になり即 card-selection に遷移", () => {
    // okami は processNextEvent を再帰呼び出し → okamiActive=true → card-selection
    const state = makeBase({ eventQueue: ["okami"] });
    const next = processNextEvent(state);
    expect(next.phase).toBe("card-selection");
    expect(next.okamiActive).toBe(true);
  });

  it("shirokuma イベントで event-shirokuma フェーズに遷移する", () => {
    const state = makeBase({ eventQueue: ["shirokuma"] });
    const next = processNextEvent(state);
    expect(next.phase).toBe("event-shirokuma");
    expect(next.eventQueue).toHaveLength(0); // シロクマはキューから取り出し済み
  });

  it("tuning イベントでスワップ不可な場合 vote フェーズに遷移する", () => {
    // UP も DOWN も空なのでスワップ不可
    const state = makeBase({
      eventQueue: ["tuning"],
      track: { up: [], down: [], recycleBox: null },
    });
    const next = processNextEvent(state);
    expect(next.phase).toBe("vote");
  });

  it("tuning イベントでスワップ可能な場合 event-tuning フェーズに遷移する", () => {
    const state = makeBase({
      eventQueue: ["tuning"],
      hands: { [P1]: [20], [P2]: [4, 5, 6] },
      track: { up: [10], down: [], recycleBox: null },
    });
    const next = processNextEvent(state);
    expect(next.phase).toBe("event-tuning");
  });
});

// ---------------------------------------------------------------------------
// processNextEvent: 当番ローテート
// ---------------------------------------------------------------------------

describe("processNextEvent: 当番ローテート", () => {
  it("repairDutyIndex が playerOrder 末尾のとき 0 に戻る", () => {
    const state = makeBase({ repairDutyIndex: 1 }); // P2 が当番
    const next = processNextEvent(state);
    expect(next.repairDutyIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkVoteResult
// ---------------------------------------------------------------------------

describe("checkVoteResult: 過半数でアサシンを指名 → ニャーメンズ勝利", () => {
  it("アサシンが逮捕されたとき correct-arrest でニャーメンズが勝つ", () => {
    const state = makeBase({
      roles: { [P1]: "nyamens", [P2]: "assassin" },
      votes: { [P1]: P2, [P2]: P1 },
      phase: "vote",
    });
    // P2 1票, P1 1票 → タイ → 逮捕なし
    const tie = checkVoteResult(state);
    expect(tie.result?.winner).toBe("assassin"); // タイなので逮捕なし → アサシン勝利

    // P1・P3 がともに P2 へ投票 → P2 が逮捕 (アサシン) → ニャーメンズ勝利
    const state3 = makeBase({
      playerOrder: [P1, P2, P3],
      hands: { [P1]: [], [P2]: [], [P3]: [] },
      drawPile: [],
      roles: { [P1]: "nyamens", [P2]: "assassin", [P3]: "nyamens" },
      votes: { [P1]: P2, [P2]: P1, [P3]: P2 },
      phase: "vote",
    });
    const next = checkVoteResult(state3);
    expect(next.phase).toBe("finished");
    expect(next.result?.winner).toBe("nyamens");
    expect(next.result?.reason).toBe("correct-arrest");
  });
});

describe("checkVoteResult: アサシン以外を逮捕 → アサシン勝利", () => {
  it("誤逮捕のとき wrong-arrest でアサシンが勝つ", () => {
    const state = makeBase({
      playerOrder: [P1, P2, P3],
      hands: { [P1]: [], [P2]: [], [P3]: [] },
      drawPile: [],
      roles: { [P1]: "nyamens", [P2]: "assassin", [P3]: "nyamens" },
      votes: { [P1]: P3, [P2]: P3, [P3]: P2 }, // P3 が 2 票 → 誤逮捕
      phase: "vote",
    });
    const next = checkVoteResult(state);
    expect(next.phase).toBe("finished");
    expect(next.result?.winner).toBe("assassin");
    expect(next.result?.reason).toBe("wrong-arrest");
  });
});

describe("checkVoteResult: アサシン不在でゲーム終了 → ニャーメンズ勝利", () => {
  it("アサシンが存在しないゲームでは no-assassin でニャーメンズが勝つ", () => {
    const state = makeBase({
      roles: { [P1]: "nyamens", [P2]: "nyamens" },
      votes: { [P1]: "none", [P2]: "none" },
      phase: "vote",
    });
    const next = checkVoteResult(state);
    expect(next.phase).toBe("finished");
    expect(next.result?.winner).toBe("nyamens");
    expect(next.result?.reason).toBe("no-assassin");
  });
});
