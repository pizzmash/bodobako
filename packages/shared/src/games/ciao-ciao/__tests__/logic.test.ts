import { describe, expect, it } from "vitest";
import {
    advancePiece,
    buildRanking,
    canChallenge,
    checkGameEnd,
    getFirstChallengerIndex,
    getNextActivePlayerIndex,
    getNextChallengerIndex,
    isPlayerActive,
    penalizeChallenger,
    removePiece,
    replenishPiece,
    rollDice,
} from "../logic.js";
import type { CiaoCiaoState } from "../types.js";

const P1 = "p1";
const P2 = "p2";
const P3 = "p3";
const P4 = "p4";

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

/** テスト用に state を shallow clone */
function clone(state: CiaoCiaoState): CiaoCiaoState {
  return {
    ...state,
    bridgePositions: { ...state.bridgePositions },
    goals: { ...state.goals },
    goalSlots: [...state.goalSlots],
    stocks: { ...state.stocks },
  };
}

// ---- canChallenge ----

describe("canChallenge", () => {
  it("橋上にコマがあればtrue", () => {
    const state = makeState();
    expect(canChallenge(state, P1)).toBe(true);
  });

  it("橋上コマなし+ゴールあればtrue", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
      goals: { [P1]: 1, [P2]: 0 },
    });
    expect(canChallenge(state, P1)).toBe(true);
  });

  it("橋上コマなし+ゴール0ならfalse", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
      goals: { [P1]: 0, [P2]: 0 },
    });
    expect(canChallenge(state, P1)).toBe(false);
  });
});

// ---- penalizeChallenger ----

describe("penalizeChallenger", () => {
  it("橋上コマがあれば落とす", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 5, [P2]: 3 },
      stocks: { [P1]: 3, [P2]: 6 },
    }));
    penalizeChallenger(state, P2);
    // P2のコマが落下してストックから補充
    expect(state.bridgePositions[P2]).toBe(0);
    expect(state.stocks[P2]).toBe(5);
  });

  it("橋上コマなし+ゴールあり → 最小slotのゴールを失う", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 3, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
      goals: { [P1]: 0, [P2]: 2 },
      goalSlots: [
        { playerId: P2, slot: 1 }, // 1着（1pt）
        { playerId: P2, slot: 3 }, // 3着（3pt）
      ],
    }));
    penalizeChallenger(state, P2);
    expect(state.goals[P2]).toBe(1);
    // slot=1（最小）が除去され、slot=3だけ残る
    expect(state.goalSlots).toEqual([{ playerId: P2, slot: 3 }]);
  });

  it("複数ゴール: 2着と4着なら2着を落とす", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 3, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
      goals: { [P1]: 0, [P2]: 2 },
      goalSlots: [
        { playerId: P2, slot: 2 }, // 2着
        { playerId: P2, slot: 4 }, // 4着
      ],
    }));
    penalizeChallenger(state, P2);
    expect(state.goals[P2]).toBe(1);
    expect(state.goalSlots).toEqual([{ playerId: P2, slot: 4 }]);
  });

  it("複数プレイヤーのgoalSlots混在: 自分の最小slotのみ除去", () => {
    const state = clone(makeState({
      playerIds: [P1, P2],
      bridgePositions: { [P1]: 3, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
      goals: { [P1]: 1, [P2]: 2 },
      goalSlots: [
        { playerId: P1, slot: 1 }, // P1の1着
        { playerId: P2, slot: 2 }, // P2の2着
        { playerId: P2, slot: 3 }, // P2の3着
      ],
    }));
    penalizeChallenger(state, P2);
    expect(state.goals[P2]).toBe(1);
    // P2のslot=2を除去。P1のslot=1とP2のslot=3が残る
    expect(state.goalSlots).toEqual([
      { playerId: P1, slot: 1 },
      { playerId: P2, slot: 3 },
    ]);
    // P1のゴールには影響なし
    expect(state.goals[P1]).toBe(1);
  });

  it("橋上コマなし+ゴール0 → 何もしない", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 3, [P2]: null },
      stocks: { [P1]: 6, [P2]: 0 },
      goals: { [P1]: 0, [P2]: 0 },
    }));
    penalizeChallenger(state, P2);
    expect(state.goals[P2]).toBe(0);
  });
});

// ---- rollDice ----

describe("rollDice", () => {
  it("1,2,3,4,'x' のいずれかを返す", () => {
    const results = new Set<string>();
    // 100回振って全種類出ることを確認
    for (let i = 0; i < 200; i++) {
      results.add(String(rollDice()));
    }
    expect(results).toContain("1");
    expect(results).toContain("2");
    expect(results).toContain("3");
    expect(results).toContain("4");
    expect(results).toContain("x");
  });

  it("1〜4 と x 以外は出ない", () => {
    for (let i = 0; i < 100; i++) {
      const val = rollDice();
      expect([1, 2, 3, 4, "x"]).toContain(val);
    }
  });
});

// ---- getNextChallengerIndex / getFirstChallengerIndex ----

describe("getNextChallengerIndex", () => {
  it("手番プレイヤーの次から時計回りに橋上プレイヤーを探す", () => {
    const state = makeState({ playerIds: [P1, P2, P3, P4], currentPlayerIndex: 0 });
    // P1が手番。P2,P3,P4 は全員橋上
    const idx = getNextChallengerIndex(state, 0);
    expect(idx).toBe(1); // P2
  });

  it("橋上にいないプレイヤーはスキップ", () => {
    const state = makeState({
      playerIds: [P1, P2, P3, P4],
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: null, [P3]: 5, [P4]: null },
    });
    const idx = getNextChallengerIndex(state, 0);
    expect(idx).toBe(2); // P3（P2はスキップ）
  });

  it("ラップアラウンドして探す", () => {
    const state = makeState({
      playerIds: [P1, P2, P3, P4],
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: null, [P3]: null, [P4]: null },
    });
    // P1以外全員橋上にいない → null
    const idx = getNextChallengerIndex(state, 0);
    expect(idx).toBeNull();
  });

  it("手番プレイヤー自身は対象外", () => {
    const state = makeState({ playerIds: [P1, P2], currentPlayerIndex: 0 });
    // afterIndex=1 の次は 0 だが、それはP1（手番）なのでスキップ → null
    const idx = getNextChallengerIndex(state, 1);
    expect(idx).toBeNull();
  });

  it("3人: 最後のチャレンジャーが信じた後に手番プレイヤーに到達 → null（無限ループしない）", () => {
    // P1が手番。P2→P3の順でチャレンジ。P3が信じた後 afterIndex=2 → 次はP1（手番）→ null
    const state = makeState({
      playerIds: [P1, P2, P3],
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: 2, [P3]: 5 },
    });
    const idx = getNextChallengerIndex(state, 2); // P3が信じた後
    expect(idx).toBeNull();
  });

  it("3人: 途中のプレイヤーが橋上にいない場合はスキップして次へ", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: null, [P3]: 5 },
      stocks: { [P1]: 6, [P2]: 0, [P3]: 6 },
    });
    const idx = getNextChallengerIndex(state, 0); // afterIndex=P1(手番)の次から
    expect(idx).toBe(2); // P2はスキップ → P3
  });

  it("3人: ゴール済みコマのあるプレイヤーもチャレンジ可能", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      currentPlayerIndex: 0,
      bridgePositions: { [P1]: 3, [P2]: null, [P3]: null },
      stocks: { [P1]: 6, [P2]: 0, [P3]: 0 },
      goals: { [P1]: 0, [P2]: 1, [P3]: 0 },
    });
    const idx = getNextChallengerIndex(state, 0);
    expect(idx).toBe(1); // P2はゴール済みコマがあるのでチャレンジ可能
  });
});

describe("getFirstChallengerIndex", () => {
  it("手番プレイヤーの左隣から探す", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      currentPlayerIndex: 1, // P2 が手番
    });
    const idx = getFirstChallengerIndex(state);
    expect(idx).toBe(2); // P3
  });
});

// ---- getNextActivePlayerIndex ----

describe("getNextActivePlayerIndex", () => {
  it("次のアクティブプレイヤーを返す", () => {
    const state = makeState({ playerIds: [P1, P2, P3] });
    expect(getNextActivePlayerIndex(state, 0)).toBe(1);
  });

  it("橋上コマなし+ストックなしのプレイヤーはスキップ", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      bridgePositions: { [P1]: 3, [P2]: null, [P3]: 5 },
      stocks: { [P1]: 6, [P2]: 0, [P3]: 6 },
    });
    expect(getNextActivePlayerIndex(state, 0)).toBe(2); // P2スキップ
  });

  it("全員脱落なら null", () => {
    const state = makeState({
      playerIds: [P1, P2],
      bridgePositions: { [P1]: null, [P2]: null },
      stocks: { [P1]: 0, [P2]: 0 },
    });
    expect(getNextActivePlayerIndex(state, 0)).toBeNull();
  });

  it("ストックがあれば橋上コマなしでもアクティブ", () => {
    const state = makeState({
      playerIds: [P1, P2],
      bridgePositions: { [P1]: null, [P2]: null },
      stocks: { [P1]: 0, [P2]: 1 },
    });
    expect(getNextActivePlayerIndex(state, 0)).toBe(1);
  });
});

// ---- isPlayerActive ----

describe("isPlayerActive", () => {
  it("橋上コマありならアクティブ", () => {
    const state = makeState();
    expect(isPlayerActive(state, P1)).toBe(true);
  });

  it("橋上なし+ストックありならアクティブ", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 3, [P2]: 6 },
    });
    expect(isPlayerActive(state, P1)).toBe(true);
  });

  it("橋上なし+ストック0なら非アクティブ", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
    });
    expect(isPlayerActive(state, P1)).toBe(false);
  });
});

// ---- advancePiece ----

describe("advancePiece", () => {
  it("通常前進", () => {
    const state = clone(makeState({ bridgePositions: { [P1]: 3, [P2]: 0 } }));
    advancePiece(state, P1, 2);
    expect(state.bridgePositions[P1]).toBe(5);
  });

  it("9以下ならゴールしない", () => {
    const state = clone(makeState({ bridgePositions: { [P1]: 5, [P2]: 0 } }));
    advancePiece(state, P1, 4);
    expect(state.bridgePositions[P1]).toBe(9);
    expect(state.goals[P1]).toBe(0);
  });

  it("10以上でゴール到達", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 7, [P2]: 0 },
      stocks: { [P1]: 3, [P2]: 6 },
    }));
    advancePiece(state, P1, 4);
    expect(state.bridgePositions[P1]).toBe(0); // ストックから補充
    expect(state.goals[P1]).toBe(1);
    expect(state.stocks[P1]).toBe(2); // 3→2
    expect(state.goalSlots).toHaveLength(1);
    expect(state.goalSlots[0]).toEqual({ playerId: P1, slot: 1 });
  });

  it("ゴール到達 + ストック0 → 橋上コマなし", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 8, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
    }));
    advancePiece(state, P1, 2);
    expect(state.bridgePositions[P1]).toBeNull();
    expect(state.goals[P1]).toBe(1);
    expect(state.stocks[P1]).toBe(0);
  });

  it("橋上にいない場合は何もしない", () => {
    const state = clone(makeState({ bridgePositions: { [P1]: null, [P2]: 0 } }));
    advancePiece(state, P1, 3);
    expect(state.bridgePositions[P1]).toBeNull();
  });
});

// ---- replenishPiece ----

describe("replenishPiece", () => {
  it("橋上なし+ストックあり → 補充", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 3, [P2]: 6 },
    }));
    replenishPiece(state, P1);
    expect(state.bridgePositions[P1]).toBe(0);
    expect(state.stocks[P1]).toBe(2);
  });

  it("橋上なし+ストック0 → 何もしない", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: null, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
    }));
    replenishPiece(state, P1);
    expect(state.bridgePositions[P1]).toBeNull();
    expect(state.stocks[P1]).toBe(0);
  });

  it("橋上にいる場合は何もしない", () => {
    const state = clone(makeState());
    replenishPiece(state, P1);
    expect(state.bridgePositions[P1]).toBe(0);
    expect(state.stocks[P1]).toBe(6);
  });
});

// ---- removePiece ----

describe("removePiece", () => {
  it("橋上コマを除去+ストックから補充", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 5, [P2]: 0 },
      stocks: { [P1]: 3, [P2]: 6 },
    }));
    removePiece(state, P1);
    expect(state.bridgePositions[P1]).toBe(0); // 補充された
    expect(state.stocks[P1]).toBe(2); // 3→2
  });

  it("ストック0 → 補充なし", () => {
    const state = clone(makeState({
      bridgePositions: { [P1]: 5, [P2]: 0 },
      stocks: { [P1]: 0, [P2]: 6 },
    }));
    removePiece(state, P1);
    expect(state.bridgePositions[P1]).toBeNull();
    expect(state.stocks[P1]).toBe(0);
  });
});

// ---- checkGameEnd ----

describe("checkGameEnd", () => {
  it("3ゴールで即勝利", () => {
    const state = makeState({ goals: { [P1]: 3, [P2]: 1 } });
    const result = checkGameEnd(state);
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBe(P1);
  });

  it("全員脱落 → ゴール数で勝者決定", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: null },
      stocks: { [P1]: 0, [P2]: 0 },
      goals: { [P1]: 2, [P2]: 1 },
    });
    const result = checkGameEnd(state);
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBe(P1);
  });

  it("全員脱落 + 全員0ゴール → 引き分け (null)", () => {
    const state = makeState({
      bridgePositions: { [P1]: null, [P2]: null },
      stocks: { [P1]: 0, [P2]: 0 },
      goals: { [P1]: 0, [P2]: 0 },
    });
    const result = checkGameEnd(state);
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBeNull();
  });

  it("まだアクティブプレイヤーあり → 未終了", () => {
    const state = makeState();
    const result = checkGameEnd(state);
    expect(result.finished).toBe(false);
  });
});

// ---- buildRanking ----

describe("buildRanking", () => {
  it("未終了ならnull", () => {
    const state = makeState();
    expect(buildRanking(state)).toBeNull();
  });

  it("勝者がいれば先頭、残りはゴール数順", () => {
    const state = makeState({
      playerIds: [P1, P2, P3],
      finished: true,
      winnerId: P1,
      goals: { [P1]: 3, [P2]: 2, [P3]: 0 },
      goalSlots: [
        { playerId: P1, slot: 1 },
        { playerId: P2, slot: 2 },
        { playerId: P1, slot: 3 },
        { playerId: P2, slot: 4 },
        { playerId: P1, slot: 5 },
      ],
    });
    const ranking = buildRanking(state);
    expect(ranking).toEqual([P1, P2, P3]);
  });

  it("引き分け → null", () => {
    const state = makeState({
      finished: true,
      winnerId: null,
    });
    expect(buildRanking(state)).toBeNull();
  });
});
