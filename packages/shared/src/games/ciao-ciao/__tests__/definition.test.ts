import { describe, expect, it, vi } from "vitest";
import { ciaoCiaoDefinition } from "../definition.js";
import * as logic from "../logic.js";
import type { CiaoCiaoState, CiaoCiaoStateView, DiceValue } from "../types.js";

const P1 = "p1";
const P2 = "p2";
const P3 = "p3";

const def = ciaoCiaoDefinition;

function makeState(overrides: Partial<CiaoCiaoState> = {}): CiaoCiaoState {
  const playerIds = overrides.playerIds ?? [P1, P2];
  return {
    playerIds,
    currentPlayerIndex: 0,
    phase: "rolling",
    diceRoll: null,
    declaredValue: null,
    currentChallengerIndex: null,
    challengeResult: null,
    bridgePositions: Object.fromEntries(playerIds.map((p) => [p, 0])),
    goals: Object.fromEntries(playerIds.map((p) => [p, 0])),
    goalSlots: [],
    stocks: Object.fromEntries(playerIds.map((p) => [p, 6])),
    finished: false,
    winnerId: null,
    ...overrides,
  };
}

function mockDice(value: DiceValue) {
  vi.spyOn(logic, "rollDice").mockReturnValueOnce(value);
}

// ---- createInitialState ----

describe("createInitialState", () => {
  it("2人: 橋上位置0、ストック6、ゴール0", () => {
    const state = def.createInitialState([P1, P2]);
    expect(state.playerIds).toEqual([P1, P2]);
    expect(state.bridgePositions[P1]).toBe(0);
    expect(state.bridgePositions[P2]).toBe(0);
    expect(state.stocks[P1]).toBe(6);
    expect(state.stocks[P2]).toBe(6);
    expect(state.goals[P1]).toBe(0);
    expect(state.goals[P2]).toBe(0);
    expect(state.phase).toBe("rolling");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.finished).toBe(false);
  });

  it("4人でも正常", () => {
    const P4 = "p4";
    const state = def.createInitialState([P1, P2, P3, P4]);
    expect(state.playerIds).toHaveLength(4);
    for (const pid of [P1, P2, P3, P4]) {
      expect(state.bridgePositions[pid]).toBe(0);
      expect(state.stocks[pid]).toBe(6);
    }
  });
});

// ---- parseMove ----

describe("parseMove", () => {
  it("roll", () => {
    expect(def.parseMove!({ type: "roll" })).toEqual({ type: "roll" });
  });

  it("declare with value 1-4", () => {
    expect(def.parseMove!({ type: "declare", value: 3 })).toEqual({ type: "declare", value: 3 });
  });

  it("declare with invalid value → null", () => {
    expect(def.parseMove!({ type: "declare", value: 5 })).toBeNull();
    expect(def.parseMove!({ type: "declare", value: 0 })).toBeNull();
    expect(def.parseMove!({ type: "declare", value: "x" })).toBeNull();
  });

  it("challenge trust/call-liar", () => {
    expect(def.parseMove!({ type: "challenge", action: "trust" })).toEqual({ type: "challenge", action: "trust" });
    expect(def.parseMove!({ type: "challenge", action: "call-liar" })).toEqual({ type: "challenge", action: "call-liar" });
  });

  it("challenge with invalid action → null", () => {
    expect(def.parseMove!({ type: "challenge", action: "bluff" })).toBeNull();
  });

  it("ack-reveal", () => {
    expect(def.parseMove!({ type: "ack-reveal" })).toEqual({ type: "ack-reveal" });
  });

  it("invalid type → null", () => {
    expect(def.parseMove!({ type: "invalid" })).toBeNull();
    expect(def.parseMove!(null)).toBeNull();
    expect(def.parseMove!("string")).toBeNull();
  });
});

// ---- validateMove ----

describe("validateMove", () => {
  it("rolling フェーズで手番プレイヤーのみ roll 可能", () => {
    const state = makeState({ phase: "rolling", currentPlayerIndex: 0 });
    expect(def.validateMove(state, { type: "roll" }, P1)).toBe(true);
    expect(def.validateMove(state, { type: "roll" }, P2)).toBe(false);
  });

  it("declaring フェーズで手番プレイヤーのみ declare 可能", () => {
    const state = makeState({ phase: "declaring", currentPlayerIndex: 0, diceRoll: 3 });
    expect(def.validateMove(state, { type: "declare", value: 3 }, P1)).toBe(true);
    expect(def.validateMove(state, { type: "declare", value: 3 }, P2)).toBe(false);
  });

  it("challenging フェーズでチャレンジャーのみ challenge 可能", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
    });
    expect(def.validateMove(state, { type: "challenge", action: "trust" }, P2)).toBe(true);
    expect(def.validateMove(state, { type: "challenge", action: "trust" }, P1)).toBe(false);
  });

  it("revealing フェーズで手番プレイヤーのみ ack-reveal 可能", () => {
    const state = makeState({ phase: "revealing", currentPlayerIndex: 0 });
    expect(def.validateMove(state, { type: "ack-reveal" }, P1)).toBe(true);
    expect(def.validateMove(state, { type: "ack-reveal" }, P2)).toBe(false);
  });

  it("finished なら全て false", () => {
    const state = makeState({ phase: "rolling", finished: true });
    expect(def.validateMove(state, { type: "roll" }, P1)).toBe(false);
  });

  it("フェーズ違反は false", () => {
    const state = makeState({ phase: "rolling" });
    expect(def.validateMove(state, { type: "declare", value: 1 }, P1)).toBe(false);
    expect(def.validateMove(state, { type: "challenge", action: "trust" }, P2)).toBe(false);
  });
});

// ---- applyMove: roll ----

describe("applyMove: roll", () => {
  it("rolling → declaring に遷移し diceRoll がセットされる", () => {
    const state = makeState();
    mockDice(3);
    const next = def.applyMove(state, { type: "roll" }, P1);
    expect(next.phase).toBe("declaring");
    expect(next.diceRoll).toBe(3);
  });

  it("橋上にコマがない場合、ストックから補充される", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 3, [P2]: 6 },
    });
    mockDice(2);
    const next = def.applyMove(state, { type: "roll" }, P1);
    expect(next.bridgePositions[P1]).toBe(0);
    expect(next.stocks[P1]).toBe(2);
  });
});

// ---- applyMove: declare → challenging ----

describe("applyMove: declare", () => {
  it("チャレンジャーがいれば challenging に遷移", () => {
    const state = makeState({
      phase: "declaring",
      diceRoll: 3,
      bridgePositions: { [P1]: 2, [P2]: 5 },
    });
    const next = def.applyMove(state, { type: "declare", value: 3 }, P1);
    expect(next.phase).toBe("challenging");
    expect(next.declaredValue).toBe(3);
    expect(next.currentChallengerIndex).toBe(1);
    // コマはまだ前進していない
    expect(next.bridgePositions[P1]).toBe(2);
  });

  it("チャレンジャーなし → 前進して次ターンへ", () => {
    // P2 は橋上にいない → チャレンジ不可
    const state = makeState({
      phase: "declaring",
      diceRoll: 2,
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
    });
    const next = def.applyMove(state, { type: "declare", value: 2 }, P1);
    expect(next.phase).toBe("rolling");
    // P1 が前進している
    expect(next.bridgePositions[P1]).toBe(5);
    // P2はアクティブでないのでスキップ→P1に戻るか?.
    // P2はstock0+bridgeNull → ゲーム終了は？→P1はまだアクティブだから続行
    // 但しgetNextActivePlayerIndexでP1回りか検証
  });

  it("チャレンジャーなし + ゴール到達", () => {
    const state = makeState({
      phase: "declaring",
      diceRoll: 4,
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 7, [P2]: null },
      stocks: { [P1]: 2, [P2]: 0 },
    });
    const next = def.applyMove(state, { type: "declare", value: 4 }, P1);
    expect(next.goals[P1]).toBe(1);
    expect(next.bridgePositions[P1]).toBe(0); // ストックから補充
    expect(next.stocks[P1]).toBe(1);
    expect(next.goalSlots).toHaveLength(1);
  });
});

// ---- applyMove: challenge trust ----

describe("applyMove: challenge trust", () => {
  it("次のチャレンジャーがいれば遷移", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: 2,
      declaredValue: 2,
      bridgePositions: { [P1]: 3, [P2]: 4, [P3]: 5 },
    });
    const next = def.applyMove(state, { type: "challenge", action: "trust" }, P2);
    expect(next.phase).toBe("challenging");
    expect(next.currentChallengerIndex).toBe(2); // P3
    // コマはまだ前進していない
    expect(next.bridgePositions[P1]).toBe(3);
  });

  it("全員信じた → 前進確定して次ターンへ", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: 3,
      declaredValue: 3,
      bridgePositions: { [P1]: 2, [P2]: 5 },
    });
    const next = def.applyMove(state, { type: "challenge", action: "trust" }, P2);
    expect(next.phase).toBe("rolling");
    // P1 が3マス前進
    expect(next.bridgePositions[P1]).toBe(5);
    // 次のターンはP2
    expect(next.currentPlayerIndex).toBe(1);
  });
});

// ---- applyMove: challenge call-liar → revealing ----

describe("applyMove: challenge call-liar", () => {
  it("ウソだった場合の challengeResult", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: "x" as DiceValue,
      declaredValue: 3,
      bridgePositions: { [P1]: 2, [P2]: 5 },
    });
    const next = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(next.phase).toBe("revealing");
    expect(next.challengeResult).not.toBeNull();
    expect(next.challengeResult!.wasLying).toBe(true);
    expect(next.challengeResult!.fallenPlayerId).toBe(P1);
    expect(next.challengeResult!.challengerId).toBe(P2);
    expect(next.challengeResult!.bonusMove).toBe(3);
    expect(next.challengeResult!.fallenFromPosition).toBe(5); // 2+3
  });

  it("本当だった場合の challengeResult", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: 3,
      declaredValue: 3,
      bridgePositions: { [P1]: 2, [P2]: 5 },
    });
    const next = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(next.phase).toBe("revealing");
    expect(next.challengeResult!.wasLying).toBe(false);
    expect(next.challengeResult!.fallenPlayerId).toBe(P2);
    expect(next.challengeResult!.bonusMove).toBeNull();
    expect(next.challengeResult!.fallenFromPosition).toBe(5); // P2の位置
  });

  it("出目が宣言と異なれば wasLying=true", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: 2,
      declaredValue: 3,
      bridgePositions: { [P1]: 1, [P2]: 4 },
    });
    const next = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(next.challengeResult!.wasLying).toBe(true);
  });
});

// ---- applyMove: ack-reveal ----

describe("applyMove: ack-reveal", () => {
  it("ウソだった → 手番プレイヤー落下 + チャレンジャーボーナス", () => {
    const state = makeState({
      phase: "revealing",
      currentPlayerIndex: 0,
      diceRoll: "x" as DiceValue,
      declaredValue: 2,
      bridgePositions: { [P1]: 3, [P2]: 4 },
      stocks: { [P1]: 2, [P2]: 6 },
      challengeResult: {
        challengerId: P2,
        actualRoll: "x",
        declaredValue: 2,
        wasLying: true,
        fallenPlayerId: P1,
        fallenFromPosition: 5,
        bonusMove: 2,
      },
    });
    const next = def.applyMove(state, { type: "ack-reveal" }, P1);
    // P1 のコマは落下 → ストックから補充
    expect(next.bridgePositions[P1]).toBe(0); // 補充
    expect(next.stocks[P1]).toBe(1); // 2→1
    // P2 は2マスボーナス
    expect(next.bridgePositions[P2]).toBe(6); // 4+2
    // 次ターン
    expect(next.phase).toBe("rolling");
    expect(next.currentPlayerIndex).toBe(1); // P2
  });

  it("本当だった → チャレンジャー落下 + 手番プレイヤー前進", () => {
    const state = makeState({
      phase: "revealing",
      currentPlayerIndex: 0,
      diceRoll: 3,
      declaredValue: 3,
      bridgePositions: { [P1]: 2, [P2]: 4 },
      stocks: { [P1]: 6, [P2]: 3 },
      challengeResult: {
        challengerId: P2,
        actualRoll: 3,
        declaredValue: 3,
        wasLying: false,
        fallenPlayerId: P2,
        fallenFromPosition: 4,
        bonusMove: null,
      },
    });
    const next = def.applyMove(state, { type: "ack-reveal" }, P1);
    // P1 が3マス前進
    expect(next.bridgePositions[P1]).toBe(5);
    // P2 落下 → 補充
    expect(next.bridgePositions[P2]).toBe(0);
    expect(next.stocks[P2]).toBe(2);
    // 次ターン
    expect(next.phase).toBe("rolling");
  });

  it("ウソだった + P1ストック0 → 補充なし", () => {
    const state = makeState({
      phase: "revealing",
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: 4 },
      stocks: { [P1]: 0, [P2]: 6 },
      challengeResult: {
        challengerId: P2,
        actualRoll: "x",
        declaredValue: 2,
        wasLying: true,
        fallenPlayerId: P1,
        fallenFromPosition: 5,
        bonusMove: 2,
      },
    });
    const next = def.applyMove(state, { type: "ack-reveal" }, P1);
    expect(next.bridgePositions[P1]).toBeNull();
    expect(next.stocks[P1]).toBe(0);
  });

  it("3ゴール → ゲーム終了", () => {
    const state = makeState({
      phase: "revealing",
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 2, [P2]: 8 },
      stocks: { [P1]: 6, [P2]: 3 },
      goals: { [P1]: 0, [P2]: 2 },
      goalSlots: [{ playerId: P2, slot: 1 }, { playerId: P2, slot: 2 }],
      challengeResult: {
        challengerId: P2,
        actualRoll: "x",
        declaredValue: 4,
        wasLying: true,
        fallenPlayerId: P1,
        fallenFromPosition: 6,
        bonusMove: 4,
      },
    });
    const next = def.applyMove(state, { type: "ack-reveal" }, P1);
    // P2 がボーナス4で position 12 → ゴール → goals=3 → 即勝利
    expect(next.finished).toBe(true);
    expect(next.winnerId).toBe(P2);
    expect(next.goals[P2]).toBe(3);
  });
});

// ---- getStatus ----

describe("getStatus", () => {
  it("playing", () => {
    expect(def.getStatus(makeState())).toBe("playing");
  });

  it("finished", () => {
    expect(def.getStatus(makeState({ finished: true }))).toBe("finished");
  });
});

// ---- getCurrentPlayerId ----

describe("getCurrentPlayerId", () => {
  it("rolling/declaring/revealing → 手番プレイヤー", () => {
    for (const phase of ["rolling", "declaring", "revealing"] as const) {
      const state = makeState({ phase, currentPlayerIndex: 0 });
      expect(def.getCurrentPlayerId(state)).toBe(P1);
    }
  });

  it("challenging → チャレンジャー", () => {
    const state = makeState({
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
    });
    expect(def.getCurrentPlayerId(state)).toBe(P2);
  });
});

// ---- getPlayerView ----

describe("getPlayerView", () => {
  it("手番プレイヤーには diceRoll が見える", () => {
    const state = makeState({ phase: "declaring", diceRoll: 3, currentPlayerIndex: 0 });
    const view = def.getPlayerView!(state, P1) as CiaoCiaoStateView;
    expect(view.diceRoll).toBe(3);
  });

  it("他プレイヤーには diceRoll が null", () => {
    const state = makeState({ phase: "declaring", diceRoll: 3, currentPlayerIndex: 0 });
    const view = def.getPlayerView!(state, P2) as CiaoCiaoStateView;
    expect(view.diceRoll).toBeNull();
  });

  it("revealing フェーズでは全員に diceRoll が見える", () => {
    const state = makeState({ phase: "revealing", diceRoll: "x" as DiceValue, currentPlayerIndex: 0 });
    const view = def.getPlayerView!(state, P2) as CiaoCiaoStateView;
    expect(view.diceRoll).toBe("x");
  });
});

// ---- getLogEntries ----

describe("getLogEntries", () => {
  it("rolling → declaring: ログなし", () => {
    const prev = makeState({ phase: "rolling" });
    const next = makeState({ phase: "declaring", diceRoll: 3 });
    expect(def.getLogEntries!(prev, next)).toEqual([]);
  });

  it("declaring → challenging: 宣言ログ", () => {
    const prev = makeState({ phase: "declaring", diceRoll: 3 });
    const next = makeState({
      phase: "challenging",
      diceRoll: 3,
      declaredValue: 3,
      currentChallengerIndex: 1,
    });
    const logs = def.getLogEntries!(prev, next);
    expect(logs).toHaveLength(1);
    expect(logs[0].tag).toBe("宣言");
    expect(logs[0].message).toContain("3");
  });

  it("challenging → revealing: 挑戦ログ", () => {
    const prev = makeState({
      phase: "challenging",
      currentChallengerIndex: 1,
      declaredValue: 3,
    });
    const next = makeState({
      phase: "revealing",
      declaredValue: 3,
      challengeResult: {
        challengerId: P2,
        actualRoll: "x",
        declaredValue: 3,
        wasLying: true,
        fallenPlayerId: P1,
        fallenFromPosition: 5,
        bonusMove: 3,
      },
    });
    const logs = def.getLogEntries!(prev, next);
    expect(logs).toHaveLength(1);
    expect(logs[0].tag).toBe("挑戦");
  });

  it("revealing → rolling（ウソ）: 落下+ボーナスログ", () => {
    const prev = makeState({
      phase: "revealing",
      challengeResult: {
        challengerId: P2,
        actualRoll: "x",
        declaredValue: 2,
        wasLying: true,
        fallenPlayerId: P1,
        fallenFromPosition: 5,
        bonusMove: 2,
      },
    });
    const next = makeState({ phase: "rolling", currentPlayerIndex: 1 });
    const logs = def.getLogEntries!(prev, next);
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].tag).toBe("落下");
    expect(logs[0].message).toContain("ウソ");
    expect(logs[1].tag).toBe("前進");
  });

  it("revealing → rolling（本当）: 落下+前進ログ", () => {
    const prev = makeState({
      phase: "revealing",
      challengeResult: {
        challengerId: P2,
        actualRoll: 3,
        declaredValue: 3,
        wasLying: false,
        fallenPlayerId: P2,
        fallenFromPosition: 4,
        bonusMove: null,
      },
    });
    const next = makeState({
      phase: "rolling",
      currentPlayerIndex: 1,
      bridgePositions: { [P1]: 5, [P2]: 0 },
    });
    const logs = def.getLogEntries!(prev, next);
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].tag).toBe("落下");
    expect(logs[0].message).toContain("本当");
    expect(logs[1].tag).toBe("前進");
  });
});

// ---- フルフロー統合テスト ----

describe("フルフロー", () => {
  it("2人プレイ: roll → declare → trust → 前進 → 次ターン", () => {
    let state = def.createInitialState([P1, P2]);
    mockDice(3);

    // P1 roll
    state = def.applyMove(state, { type: "roll" }, P1);
    expect(state.phase).toBe("declaring");
    expect(state.diceRoll).toBe(3);

    // P1 declare 3（正直）
    state = def.applyMove(state, { type: "declare", value: 3 }, P1);
    expect(state.phase).toBe("challenging");
    expect(state.declaredValue).toBe(3);

    // P2 trust → 全員信じた → P1前進3 → P2のターン
    state = def.applyMove(state, { type: "challenge", action: "trust" }, P2);
    expect(state.phase).toBe("rolling");
    expect(state.bridgePositions[P1]).toBe(3);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("2人プレイ: roll → declare(ウソ) → call-liar → reveal → 落下", () => {
    let state = def.createInitialState([P1, P2]);
    mockDice("x");

    // P1 roll（出目×）
    state = def.applyMove(state, { type: "roll" }, P1);
    expect(state.diceRoll).toBe("x");

    // P1 declare 2（×なので必ずウソ）
    state = def.applyMove(state, { type: "declare", value: 2 }, P1);
    expect(state.phase).toBe("challenging");

    // P2 call-liar
    state = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(state.phase).toBe("revealing");
    expect(state.challengeResult!.wasLying).toBe(true);

    // P1 ack-reveal
    state = def.applyMove(state, { type: "ack-reveal" }, P1);
    expect(state.phase).toBe("rolling");
    // P1のコマは落下 → ストックから補充
    expect(state.bridgePositions[P1]).toBe(0);
    expect(state.stocks[P1]).toBe(5);
    // P2 ボーナス2マス
    expect(state.bridgePositions[P2]).toBe(2);
    // P2のターン
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("2人プレイ: call-liar で外れ → チャレンジャー落下", () => {
    let state = def.createInitialState([P1, P2]);
    mockDice(4);

    state = def.applyMove(state, { type: "roll" }, P1);
    state = def.applyMove(state, { type: "declare", value: 4 }, P1);
    state = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(state.challengeResult!.wasLying).toBe(false);

    state = def.applyMove(state, { type: "ack-reveal" }, P1);
    // P1 前進4
    expect(state.bridgePositions[P1]).toBe(4);
    // P2 落下 → 補充
    expect(state.bridgePositions[P2]).toBe(0);
    expect(state.stocks[P2]).toBe(5);
  });

  it("3ゴール勝利シナリオ", () => {
    let state = makeState({
      phase: "declaring",
      currentPlayerIndex: 0,
      diceRoll: 4,
      bridgePositions: { [P1]: 8, [P2]: 3 },
      goals: { [P1]: 2, [P2]: 0 },
      goalSlots: [{ playerId: P1, slot: 1 }, { playerId: P1, slot: 2 }],
      stocks: { [P1]: 3, [P2]: 6 },
    });

    // P1 declare 4 → ゴール → goals=3 → 勝利（チャレンジャーなし or あり）
    // P2 は橋上にいるのでチャレンジ可能
    state = def.applyMove(state, { type: "declare", value: 4 }, P1);
    expect(state.phase).toBe("challenging");

    // P2 trust → P1前進 → ゴール → 3ゴール → 勝利
    state = def.applyMove(state, { type: "challenge", action: "trust" }, P2);
    expect(state.finished).toBe(true);
    expect(state.winnerId).toBe(P1);
    expect(state.goals[P1]).toBe(3);
  });

  it("3人プレイ: P2信じる → P3信じる → 全員巡回 → P1前進して次ターン（無限ループなし）", () => {
    // 修正前は P3 が信じた後に P2 に再度チェックが回っていた
    let state = makeState({
      playerIds: [P1, P2, P3],
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1, // P2 から開始
      diceRoll: 2,
      declaredValue: 2,
      bridgePositions: { [P1]: 3, [P2]: 4, [P3]: 5 },
    });

    // P2 trust → 次は P3
    state = def.applyMove(state, { type: "challenge", action: "trust" }, P2);
    expect(state.phase).toBe("challenging");
    expect(state.currentChallengerIndex).toBe(2); // P3

    // P3 trust → P1(手番)に戻る → null → 全員巡回済み → 前進して次ターン
    state = def.applyMove(state, { type: "challenge", action: "trust" }, P3);
    expect(state.phase).toBe("rolling");
    expect(state.bridgePositions[P1]).toBe(5); // 3+2
    expect(state.currentPlayerIndex).toBe(1); // P2のターン
  });

  it("3人プレイ: P2が途中でウソだ！ → revealing → P3はチャレンジしない", () => {
    let state = makeState({
      playerIds: [P1, P2, P3],
      phase: "challenging",
      currentPlayerIndex: 0,
      currentChallengerIndex: 1,
      diceRoll: "x" as DiceValue,
      declaredValue: 2,
      bridgePositions: { [P1]: 3, [P2]: 4, [P3]: 5 },
    });

    // P2 call-liar → revealing フェーズへ（P3はチャレンジしない）
    state = def.applyMove(state, { type: "challenge", action: "call-liar" }, P2);
    expect(state.phase).toBe("revealing");
    expect(state.challengeResult!.challengerId).toBe(P2);
    expect(state.challengeResult!.wasLying).toBe(true);
  });

  it("チャレンジャーがゴール済みコマのみ保有: 外れた場合に最小slotのゴールを失う", () => {
    // P2 が橋上になく、ゴール2つ (1着 + 3着) を保有している状態でチャレンジして外れる
    let state = makeState({
      phase: "revealing",
      currentPlayerIndex: 0,
      diceRoll: 3,
      declaredValue: 3,
      bridgePositions: { [P1]: 2, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
      goals: { [P1]: 0, [P2]: 2 },
      goalSlots: [
        { playerId: P2, slot: 1 }, // 1着（1pt）
        { playerId: P2, slot: 3 }, // 3着（3pt）
      ],
      challengeResult: {
        challengerId: P2,
        actualRoll: 3,     // 宣言と一致 → 本当 → P2落下
        declaredValue: 3,
        wasLying: false,
        fallenPlayerId: P2,
        fallenFromPosition: 0,
        bonusMove: null,
      },
    });

    state = def.applyMove(state, { type: "ack-reveal" }, P1);
    // P2 のゴール数が1つ減る
    expect(state.goals[P2]).toBe(1);
    // slot=1 (最小) が除去され slot=3 が残る
    expect(state.goalSlots.filter((s) => s.playerId === P2)).toEqual([
      { playerId: P2, slot: 3 },
    ]);
    // P1 は前進
    expect(state.bridgePositions[P1]).toBe(5); // 2+3
  });
});
