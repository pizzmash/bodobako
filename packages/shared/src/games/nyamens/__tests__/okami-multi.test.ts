import { describe, expect, it } from "vitest";
import { processNextEvent } from "../logic.js";
import type { NyaMensState } from "../types.js";

const P1 = "p1";
const P2 = "p2";
const P3 = "p3";

function makeBase(overrides: Partial<NyaMensState> = {}): NyaMensState {
  return {
    phase: "dice-roll",
    playerOrder: [P1, P2, P3],
    handSize: 3,
    roles: { [P1]: "nyamens", [P2]: "nyamens", [P3]: "nyamens" },
    hands: { [P1]: [1, 2, 3], [P2]: [4, 5, 6], [P3]: [7, 8, 9] },
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
    ...overrides,
  };
}

describe("processNextEvent: okamiイベントが複数枚キューにある場合、1枚ずつ正しく処理される", () => {
  it("okamiが2枚連続でキューにある場合、1枚目でokamiActiveがtrueになり、2枚目は次ターンで処理される", () => {
    let state = makeBase({ eventQueue: ["okami", "okami"] });
    // 1枚目処理
    state = processNextEvent(state);
    expect(state.okamiActive).toBe(true);
    expect(state.eventQueue).toEqual(["okami"]);
    // 2枚目処理（okamiActiveをfalseにして再度呼ぶ）
    state = processNextEvent({ ...state, okamiActive: false });
    expect(state.okamiActive).toBe(true);
    expect(state.eventQueue).toEqual([]);
  });

  it("okamiが3枚連続でキューにある場合も1枚ずつ処理される", () => {
    let state = makeBase({ eventQueue: ["okami", "okami", "okami"] });
    // 1枚目
    state = processNextEvent(state);
    expect(state.okamiActive).toBe(true);
    expect(state.eventQueue).toEqual(["okami", "okami"]);
    // 2枚目
    state = processNextEvent({ ...state, okamiActive: false });
    expect(state.okamiActive).toBe(true);
    expect(state.eventQueue).toEqual(["okami"]);
    // 3枚目
    state = processNextEvent({ ...state, okamiActive: false });
    expect(state.okamiActive).toBe(true);
    expect(state.eventQueue).toEqual([]);
  });
});
