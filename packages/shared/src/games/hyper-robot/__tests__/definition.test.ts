import { describe, expect, it } from "vitest";
import { hyperRobotDefinition } from "../definition.js";
import type { HyperRobotState, RobotColor, TargetMark } from "../types.js";

function createState(playerIds: string[]): HyperRobotState {
  return hyperRobotDefinition.createInitialState(playerIds);
}

function makeMinimalState(overrides: Partial<HyperRobotState> = {}): HyperRobotState {
  const base = createState(["p1", "p2"]);
  return { ...base, ...overrides };
}

describe("createInitialState", () => {
  it("正しい初期フェーズ", () => {
    const state = createState(["p1", "p2"]);
    expect(state.phase).toBe("configuring");
    expect(state.biddingOpen).toBe(false);
    expect(state.bids).toHaveLength(0);
  });

  it("winChips: 2人 → 8", () => {
    const state = createState(["p1", "p2"]);
    expect(state.winChips).toBe(8);
  });

  it("winChips: 3人 → 6", () => {
    const state = createState(["p1", "p2", "p3"]);
    expect(state.winChips).toBe(6);
  });

  it("winChips: 4人 → 5", () => {
    const state = createState(["p1", "p2", "p3", "p4"]);
    expect(state.winChips).toBe(5);
  });

  it("winChips: 5人 → 3", () => {
    const state = createState(["p1", "p2", "p3", "p4", "p5"]);
    expect(state.winChips).toBe(3);
  });

  it("chips が全プレイヤー 0 で初期化", () => {
    const state = createState(["p1", "p2", "p3"]);
    expect(state.chips).toEqual({ p1: 0, p2: 0, p3: 0 });
  });

  it("currentTarget は null（start-game 後に設定される）", () => {
    const state = createState(["p1", "p2"]);
    expect(state.currentTarget).toBeNull();
  });

  it("ロボットが 5 体全て配置されている", () => {
    const state = createState(["p1", "p2"]);
    const colors: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];
    for (const color of colors) {
      expect(state.robots[color]).toBeDefined();
      expect(state.robots[color].row).toBeGreaterThanOrEqual(0);
      expect(state.robots[color].col).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("parseMove", () => {
  it("bid: 正常", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "bid", count: 3 })).toEqual({ type: "bid", count: 3 });
  });

  it("bid: count が負 → null", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "bid", count: -1 })).toBeNull();
  });

  it("bid: count が非整数 → null", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "bid", count: 1.5 })).toBeNull();
  });

  it("end-bidding: 正常", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "end-bidding" })).toEqual({ type: "end-bidding" });
  });

  it("skip-target: 正常", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "skip-target" })).toEqual({ type: "skip-target" });
  });

  it("move-robot: 正常", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "move-robot", color: "red", direction: "up" })).toEqual({
      type: "move-robot", color: "red", direction: "up",
    });
  });

  it("move-robot: 無効な color → null", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "move-robot", color: "purple", direction: "up" })).toBeNull();
  });

  it("move-robot: 無効な direction → null", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "move-robot", color: "red", direction: "diagonal" })).toBeNull();
  });

  it("give-up: 正常", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "give-up" })).toEqual({ type: "give-up" });
  });

  it("不明な type → null", () => {
    expect(hyperRobotDefinition.parseMove!({ type: "unknown" })).toBeNull();
  });

  it("null → null", () => {
    expect(hyperRobotDefinition.parseMove!(null)).toBeNull();
  });

  it("非オブジェクト → null", () => {
    expect(hyperRobotDefinition.parseMove!("bid")).toBeNull();
  });
});

describe("宣言→end-bidding→move-robotでチップ獲得", () => {
  it("チップ獲得後に次のターゲットへ", () => {
    const state2 = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
      chips: { p1: 0, p2: 0 },
      currentTarget: { id: 1, position: { row: 5, col: 5 }, color: "red" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 3 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });
    // rightWalls[5][5] = true で (5,5) で止まる
    state2.rightWalls[5]![5] = true;

    let s2 = hyperRobotDefinition.applyMove(state2, { type: "bid", count: 1 }, "p1");
    s2 = hyperRobotDefinition.applyMove(s2, { type: "end-bidding" }, "p1");
    expect(s2.phase).toBe("solving");
    s2 = hyperRobotDefinition.applyMove(s2, { type: "move-robot", color: "red", direction: "right" }, "p1");

    // チップ獲得
    expect(s2.chips["p1"]).toBe(1);
    // revealing フェーズへ
    expect(s2.phase).toBe("revealing");
    expect(s2.revealingPlayer).toBe("p1");
    expect(s2.revealingTarget).not.toBeNull();

    // next-target で bidding へ
    s2 = hyperRobotDefinition.applyMove(s2, { type: "next-target" }, "p1");
    expect(s2.phase).toBe("bidding");
    expect(s2.bids).toHaveLength(0);
    expect(s2.biddingOpen).toBe(true);
  });
});

describe("失敗→次宣言者", () => {
  it("手数超過で次の宣言者に移る", () => {
    const state = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [
        { playerId: "p1", count: 1, orderId: 0 },
        { playerId: "p2", count: 2, orderId: 1 },
      ],
      currentBidIndex: 0,
      moveCount: 0,
      chips: { p1: 0, p2: 0 },
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
      robotsSnapshot: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });

    // p1 が 1手で解けない → 移動後 moveCount=1 >= count=1 で nextSolver
    const s = hyperRobotDefinition.applyMove(state, { type: "move-robot", color: "red", direction: "right" }, "p1");
    // p2 に移る
    expect(s.currentBidIndex).toBe(1);
    expect(s.moveCount).toBe(0);
  });
});

describe("全員失敗→再宣言フェーズ", () => {
  it("最後の宣言者が失敗したら再宣言", () => {
    const state = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [
        { playerId: "p1", count: 1, orderId: 0 },
      ],
      currentBidIndex: 0,
      moveCount: 0,
      chips: { p1: 0, p2: 0 },
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
      robotsSnapshot: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });

    // p1 が 1手で失敗（移動後 moveCount=1 >= count=1 でnextSolver、次がいない → 全員失敗）
    const s = hyperRobotDefinition.applyMove(state, { type: "move-robot", color: "red", direction: "right" }, "p1");
    expect(s.phase).toBe("bidding");
    expect(s.bids).toHaveLength(0);
    expect(s.biddingOpen).toBe(true);
  });

  it("give-up で全員失敗", () => {
    const state = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
      moveCount: 0,
      chips: { p1: 0, p2: 0 },
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
      robotsSnapshot: {
        red: { row: 5, col: 5 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "give-up" }, "p1");
    expect(s.phase).toBe("bidding");
    expect(s.bids).toHaveLength(0);
    expect(s.biddingOpen).toBe(true);
  });
});

describe("勝利条件", () => {
  it("winChips 枚獲得で finished", () => {
    const state = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [{ playerId: "p1", count: 1, orderId: 0 }],
      currentBidIndex: 0,
      moveCount: 0,
      chips: { p1: 7, p2: 0 }, // あと1枚でwinChips=8
      winChips: 8,
      currentTarget: { id: 1, position: { row: 5, col: 5 }, color: "red" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 3 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
      robotsSnapshot: {
        red: { row: 5, col: 3 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });
    state.rightWalls[5]![5] = true;

    const s = hyperRobotDefinition.applyMove(state, { type: "move-robot", color: "red", direction: "right" }, "p1");
    expect(s.phase).toBe("finished");
    expect(s.chips["p1"]).toBe(8);
  });

  it("getStatus: finished → 'finished'", () => {
    const state = makeMinimalState({ phase: "finished" });
    expect(hyperRobotDefinition.getStatus(state)).toBe("finished");
  });

  it("getStatus: bidding → 'playing'", () => {
    const state = makeMinimalState({ phase: "bidding" });
    expect(hyperRobotDefinition.getStatus(state)).toBe("playing");
  });
});

describe("getRanking", () => {
  it("chips 降順でランキング", () => {
    const state = makeMinimalState({
      phase: "finished",
      chips: { p1: 5, p2: 3 },
      playerIds: ["p1", "p2"],
    });
    const ranking = hyperRobotDefinition.getRanking(state);
    expect(ranking).toEqual(["p1", "p2"]);
  });

  it("chips が同じ場合は null（引き分け）", () => {
    const state = makeMinimalState({
      phase: "finished",
      chips: { p1: 3, p2: 3 },
      playerIds: ["p1", "p2"],
    });
    const ranking = hyperRobotDefinition.getRanking(state);
    expect(ranking).toBeNull();
  });
});

describe("bid 更新ロジック", () => {
  it("同じプレイヤーが低い count で上書き", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 5, orderId: 0 }],
      nextOrderId: 1,
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "bid", count: 3 }, "p1");
    expect(s.bids).toHaveLength(1);
    expect(s.bids[0]!.count).toBe(3);
  });

  it("同じプレイヤーが高い count で宣言しようとすると validateMove が false", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      nextOrderId: 1,
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "bid", count: 5 }, "p1")).toBe(false);
  });

  it("timerVersion が最小 count 低下時にインクリメント", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 5, orderId: 0 }],
      nextOrderId: 1,
      timerVersion: 2,
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "bid", count: 3 }, "p2");
    expect(s.timerVersion).toBe(3);
  });
});

describe("end-bidding (bids=0の自動スキップ)", () => {
  it("bids が空で end-bidding すると自動的に次のターゲットへ進む", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    // 自動スキップ → 次のターゲットへ進んで biddingOpen: true
    expect(s.phase).toBe("bidding");
    expect(s.biddingOpen).toBe(true);
    expect(s.bids).toHaveLength(0);
  });
});

describe("skip-target", () => {
  it("validateMove: ホストのみ実行可（bids=0, biddingOpen=true）", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
      playerIds: ["p1", "p2"],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, "p1")).toBe(true);
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, "p2")).toBe(false);
  });

  it("validateMove: bids が 1 つ以上あれば false", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      playerIds: ["p1", "p2"],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, "p1")).toBe(false);
  });

  it("applyMove: 次のターゲットへ進む", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
      playerIds: ["p1", "p2"],
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "skip-target" }, "p1");
    expect(s.phase).toBe("bidding");
    expect(s.biddingOpen).toBe(true);
    expect(s.bids).toHaveLength(0);
  });
});

describe("getCurrentPlayerId", () => {
  it("bidding フェーズでは空文字", () => {
    const state = makeMinimalState({ phase: "bidding" });
    expect(hyperRobotDefinition.getCurrentPlayerId(state)).toBe("");
  });

  it("solving フェーズでは現在の解決者", () => {
    const state = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p2", count: 3, orderId: 0 }],
      currentBidIndex: 0,
    });
    expect(hyperRobotDefinition.getCurrentPlayerId(state)).toBe("p2");
  });

  it("finished フェーズでは空文字", () => {
    const state = makeMinimalState({ phase: "finished" });
    expect(hyperRobotDefinition.getCurrentPlayerId(state)).toBe("");
  });
});

describe("リトライロジック", () => {
  function setupSolvingState(state: HyperRobotState, playerIds: string[]): HyperRobotState {
    const def = hyperRobotDefinition;
    let s = def.applyMove(def.applyMove(state, { type: "start-game", winChips: 3 }, playerIds[0]!), { type: "bid", count: 3 }, playerIds[0]!);
    for (let i = 1; i < playerIds.length; i++) {
      s = def.applyMove(s, { type: "bid", count: 3 + i }, playerIds[i]!);
    }
    s = def.applyMove(s, { type: "end-bidding" }, playerIds[0]!);
    return s;
  }

  it("1回目の全員失敗で isRetry:true かつ timerVersion が増加する", () => {
    const playerIds = ["p1", "p2"];
    const state = hyperRobotDefinition.createInitialState(playerIds);
    expect(state.isRetry).toBe(false);

    let s = setupSolvingState(state, playerIds);
    expect(s.phase).toBe("solving");
    const prevTimerVersion = s.timerVersion;

    s = hyperRobotDefinition.applyMove(s, { type: "give-up" }, playerIds[0]!);
    expect(s.phase).toBe("solving");
    expect(s.currentBidIndex).toBe(1);

    s = hyperRobotDefinition.applyMove(s, { type: "give-up" }, playerIds[1]!);
    expect(s.phase).toBe("bidding");
    expect(s.isRetry).toBe(true);
    expect(s.timerVersion).toBe(prevTimerVersion + 1);
    expect(s.bids).toHaveLength(0);
  });

  it("2回目の全員失敗でターゲットが進み isRetry:false になる", () => {
    const playerIds = ["p1", "p2"];
    const state = hyperRobotDefinition.createInitialState(playerIds);
    let s = setupSolvingState(state, playerIds);
    const firstTargetId = s.currentTarget?.id;

    s = hyperRobotDefinition.applyMove(s, { type: "give-up" }, playerIds[0]!);
    s = hyperRobotDefinition.applyMove(s, { type: "give-up" }, playerIds[1]!);
    expect(s.isRetry).toBe(true);

    s = hyperRobotDefinition.applyMove(s, { type: "bid", count: 2 }, playerIds[0]!);
    s = hyperRobotDefinition.applyMove(s, { type: "end-bidding" }, playerIds[0]!);
    s = hyperRobotDefinition.applyMove(s, { type: "give-up" }, playerIds[0]!);

    expect(s.phase).toBe("bidding");
    expect(s.isRetry).toBe(false);
    expect(s.currentTarget?.id).not.toBe(firstTargetId);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// validateMove 追加テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("validateMove - start-game 追加テスト", () => {
  it("非ホスト（playerIds[1]）は configuring フェーズでも false", () => {
    const state = makeMinimalState({ phase: "configuring", playerIds: ["p1", "p2"] });
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 8 }, "p2")).toBe(false);
  });

  it("bidding フェーズではホストでも false", () => {
    const state = makeMinimalState({ phase: "bidding", playerIds: ["p1", "p2"] });
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 8 }, "p1")).toBe(false);
  });

  it("winChips=0 → false、winChips=1 → true、winChips=17 → true、winChips=18 → false", () => {
    const state = makeMinimalState({ phase: "configuring", playerIds: ["p1", "p2"] });
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 0 }, "p1")).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 1 }, "p1")).toBe(true);
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 17 }, "p1")).toBe(true);
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 18 }, "p1")).toBe(false);
  });
});

describe("validateMove - skip-target リグレッション", () => {
  it("solving フェーズではホストでも false", () => {
    const state = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [],
      playerIds: ["p1", "p2"],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, "p1")).toBe(false);
  });

  it("biddingOpen=false では false（phase: bidding でも）", () => {
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: false,
      bids: [],
      playerIds: ["p1", "p2"],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, "p1")).toBe(false);
  });
});

describe("validateMove - move-robot", () => {
  it("現在の解決者以外は false（p2 が p1 の番に送る）", () => {
    const state = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "move-robot", color: "red", direction: "up" }, "p2")).toBe(false);
  });

  it("bidding フェーズでは false", () => {
    const state = makeMinimalState({ phase: "bidding" });
    expect(hyperRobotDefinition.validateMove(state, { type: "move-robot", color: "red", direction: "up" }, "p1")).toBe(false);
  });
});

describe("validateMove - give-up", () => {
  it("現在の解決者以外は false", () => {
    const state = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "give-up" }, "p2")).toBe(false);
  });

  it("solving 以外では false（bidding フェーズ）", () => {
    const state = makeMinimalState({ phase: "bidding" });
    expect(hyperRobotDefinition.validateMove(state, { type: "give-up" }, "p1")).toBe(false);
  });
});

describe("validateMove - next-target", () => {
  it("revealing フェーズでは true（全プレイヤー共通）", () => {
    const state = makeMinimalState({ phase: "revealing", playerIds: ["p1", "p2"] });
    expect(hyperRobotDefinition.validateMove(state, { type: "next-target" }, "p1")).toBe(true);
    expect(hyperRobotDefinition.validateMove(state, { type: "next-target" }, "p2")).toBe(true);
  });

  it("bidding フェーズでは false", () => {
    const state = makeMinimalState({ phase: "bidding" });
    expect(hyperRobotDefinition.validateMove(state, { type: "next-target" }, "p1")).toBe(false);
  });
});

describe("validateMove - 存在しないプレイヤー", () => {
  it("playerIds に含まれないプレイヤーはすべての move で false", () => {
    const state = makeMinimalState({
      playerIds: ["p1", "p2"],
      phase: "bidding",
      biddingOpen: true,
    });
    const unknownPlayer = "unknown";
    // 全ての move type で false を返す
    expect(hyperRobotDefinition.validateMove(state, { type: "bid", count: 3 }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "end-bidding" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "skip-target" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "move-robot", color: "red", direction: "up" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "give-up" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "confirm-bid" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "unconfirm-bid" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "next-target" }, unknownPlayer)).toBe(false);
    expect(hyperRobotDefinition.validateMove(state, { type: "start-game", winChips: 8 }, unknownPlayer)).toBe(false);
  });
});

describe("validateMove - confirm-bid / unconfirm-bid", () => {
  it("既に confirmedBidders にいる場合 confirm-bid は false", () => {
    const state = makeMinimalState({
      phase: "bidding",
      confirmedBidders: ["p1"],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "confirm-bid" }, "p1")).toBe(false);
  });

  it("confirmedBidders にいない場合 unconfirm-bid は false", () => {
    const state = makeMinimalState({
      phase: "bidding",
      confirmedBidders: [],
    });
    expect(hyperRobotDefinition.validateMove(state, { type: "unconfirm-bid" }, "p1")).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// targetRobotLeftTarget メカニズム
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("targetRobotLeftTarget メカニズム", () => {
  // solving フェーズへ移行するためのヘルパー（end-bidding 経由）
  function enterSolvingFromBidding(
    target: TargetMark,
    robotOverrides: Partial<Record<RobotColor, { row: number; col: number }>>,
  ) {
    const robots = {
      red: { row: 5, col: 5 },
      yellow: { row: 0, col: 1 },
      green: { row: 1, col: 1 },
      blue: { row: 2, col: 1 },
      silver: { row: 3, col: 1 },
      ...robotOverrides,
    };
    // ランダムな壁で移動が邪魔されないよう壁をすべてクリア
    const emptyWalls = () => Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 5, orderId: 0 }],
      winChips: 8,
      chips: { p1: 0, p2: 0 },
      currentTarget: target,
      robots,
      rightWalls: emptyWalls(),
      bottomWalls: emptyWalls(),
    });
    return state;
  }

  it("解決開始時にターゲット色ロボットがターゲット位置にいると targetRobotLeftTarget=false に初期化", () => {
    // red ロボットがターゲット位置 (5,5) にいる状態で solving へ移行
    const target: TargetMark = { id: 1, position: { row: 5, col: 5 }, color: "red" };
    const state = enterSolvingFromBidding(target, { red: { row: 5, col: 5 } });
    const s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    expect(s.phase).toBe("solving");
    // ターゲット位置にいるため、まだ離れていない → false
    expect(s.targetRobotLeftTarget).toBe(false);
  });

  it("ターゲット色ロボットが離れると targetRobotLeftTarget が true に更新される", () => {
    const target: TargetMark = { id: 1, position: { row: 5, col: 5 }, color: "red" };
    const state = enterSolvingFromBidding(target, { red: { row: 5, col: 5 } });
    let s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(false);

    // red が (5,5) から上に移動 → ターゲットを離れた → true に更新
    s = hyperRobotDefinition.applyMove(s, { type: "move-robot", color: "red", direction: "up" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(true);
  });

  it("ターゲットを離れてから戻るとゴール成功", () => {
    const target: TargetMark = { id: 1, position: { row: 5, col: 5 }, color: "red" };
    const state = enterSolvingFromBidding(target, { red: { row: 5, col: 5 } });
    // bottomWalls[5][5]=true で red が下から (5,5) で止まれる
    state.bottomWalls[5]![5] = true;

    let s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(false);

    // red が上に移動してターゲット位置を離れる
    s = hyperRobotDefinition.applyMove(s, { type: "move-robot", color: "red", direction: "up" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(true);
    expect(s.robots.red).toEqual({ row: 0, col: 5 });

    // red が下に移動して (5,5) に戻る → ゴール成功
    s = hyperRobotDefinition.applyMove(s, { type: "move-robot", color: "red", direction: "down" }, "p1");
    expect(s.robots.red).toEqual({ row: 5, col: 5 });
    expect(s.phase).toBe("revealing");
    expect(s.chips["p1"]).toBe(1);
  });

  it("rainbow ターゲット - ロボットがターゲット上に開始した場合 false に初期化", () => {
    // blue ロボットが rainbow ターゲット位置 (5,5) にいる
    const target: TargetMark = { id: 2, position: { row: 5, col: 5 }, color: "rainbow" };
    const state = enterSolvingFromBidding(target, {
      red: { row: 5, col: 0 },
      blue: { row: 5, col: 5 },
    });
    const s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    expect(s.phase).toBe("solving");
    // rainbow ターゲット上にロボットがいるのでまだ離れていない → false
    expect(s.targetRobotLeftTarget).toBe(false);
  });

  it("rainbow ターゲット - ロボットが離れてから任意色ロボットが戻ると達成", () => {
    // blue が rainbow ターゲット (5,5) にいる
    const target: TargetMark = { id: 2, position: { row: 5, col: 5 }, color: "rainbow" };
    const state = enterSolvingFromBidding(target, {
      red: { row: 5, col: 0 },
      blue: { row: 5, col: 5 },
    });
    // rightWalls[5][5]=true で red が右移動で (5,5) で止まれる
    state.rightWalls[5]![5] = true;

    let s = hyperRobotDefinition.applyMove(state, { type: "end-bidding" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(false);

    // blue が上に移動して rainbow ターゲットを離れる
    s = hyperRobotDefinition.applyMove(s, { type: "move-robot", color: "blue", direction: "up" }, "p1");
    expect(s.targetRobotLeftTarget).toBe(true);

    // red が右に移動して (5,5) に到達 → rainbow ゴール成功
    s = hyperRobotDefinition.applyMove(s, { type: "move-robot", color: "red", direction: "right" }, "p1");
    expect(s.robots.red).toEqual({ row: 5, col: 5 });
    expect(s.phase).toBe("revealing");
    expect(s.chips["p1"]).toBe(1);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// confirm-bid フロー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("confirm-bid フロー", () => {
  function makeConfirmState() {
    return makeMinimalState({
      phase: "bidding",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      confirmedBidders: [],
      playerIds: ["p1", "p2"],
    });
  }

  it("1人が confirm-bid してもまだ solving に移行しない", () => {
    const state = makeConfirmState();
    // p1 だけ確認 → p2 が未確認なので bidding のまま
    const s = hyperRobotDefinition.applyMove(state, { type: "confirm-bid" }, "p1");
    expect(s.phase).toBe("bidding");
    expect(s.confirmedBidders).toContain("p1");
  });

  it("全プレイヤーが confirm-bid すると solving に遷移する", () => {
    const state = makeConfirmState();
    let s = hyperRobotDefinition.applyMove(state, { type: "confirm-bid" }, "p1");
    // p2 が確認 → 全員揃ったので solving へ
    s = hyperRobotDefinition.applyMove(s, { type: "confirm-bid" }, "p2");
    expect(s.phase).toBe("solving");
    expect(s.confirmedBidders).toHaveLength(0);
  });

  it("unconfirm-bid で confirmedBidders から除外される", () => {
    const state = makeConfirmState();
    let s = hyperRobotDefinition.applyMove(state, { type: "confirm-bid" }, "p1");
    expect(s.confirmedBidders).toContain("p1");
    // p1 が確認を取り消す
    s = hyperRobotDefinition.applyMove(s, { type: "unconfirm-bid" }, "p1");
    expect(s.confirmedBidders).not.toContain("p1");
  });

  it("bid 更新後に confirmedBidders から除外される（bid が更新されたら確認リセット）", () => {
    // p1 が bid を出した後に confirm した状態
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [{ playerId: "p1", count: 5, orderId: 0 }],
      confirmedBidders: ["p1"],
      nextOrderId: 1,
      playerIds: ["p1", "p2"],
    });
    // p1 が bid を低い手数に更新 → p1 が confirmedBidders から除外される
    const s = hyperRobotDefinition.applyMove(state, { type: "bid", count: 3 }, "p1");
    expect(s.confirmedBidders).not.toContain("p1");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// nextSolver - ロボット位置リセットと lastFailureRobots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("nextSolver - ロボット位置リセットと lastFailureRobots", () => {
  function makeTwoSolverState() {
    const robots = {
      red: { row: 5, col: 3 },
      yellow: { row: 0, col: 1 },
      green: { row: 1, col: 1 },
      blue: { row: 2, col: 1 },
      silver: { row: 3, col: 1 },
    };
    // ランダムな壁で移動が邪魔されないよう壁をすべてクリア
    const emptyWalls = () => Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    return makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [
        { playerId: "p1", count: 1, orderId: 0 },
        { playerId: "p2", count: 2, orderId: 1 },
      ],
      currentBidIndex: 0,
      moveCount: 0,
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots,
      robotsSnapshot: { ...robots },
      rightWalls: emptyWalls(),
      bottomWalls: emptyWalls(),
    });
  }

  it("失敗した時点のロボット位置が lastFailureRobots に記録される", () => {
    const state = makeTwoSolverState();
    // rightWalls[5][7]=true → red が右移動で (5,7) で止まる
    state.rightWalls[5]![7] = true;
    // p1 が 1手で失敗（count=1, moveCount 0→1 >= count=1）→ nextSolver
    const s = hyperRobotDefinition.applyMove(state, { type: "move-robot", color: "red", direction: "right" }, "p1");
    expect(s.currentBidIndex).toBe(1);
    // 移動後の位置が lastFailureRobots に記録されている
    expect(s.lastFailureRobots?.red).toEqual({ row: 5, col: 7 });
  });

  it("次の解決者に移行した際に robots が robotsSnapshot にリセットされる", () => {
    const state = makeTwoSolverState();
    state.rightWalls[5]![7] = true;
    const s = hyperRobotDefinition.applyMove(state, { type: "move-robot", color: "red", direction: "right" }, "p1");
    expect(s.currentBidIndex).toBe(1);
    // robots は robotsSnapshot の内容にリセットされている
    expect(s.robots.red).toEqual(state.robotsSnapshot.red);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// getLogEntries テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("getLogEntries - bid 宣言・更新", () => {
  it("新規 bid 宣言でログが生成される（「X 手を宣言」）", () => {
    const prevState = makeMinimalState({ phase: "bidding", bids: [] });
    const newState = makeMinimalState({
      phase: "bidding",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    expect(logs.some((e) => e.playerId === "p1" && e.message === "3 手を宣言")).toBe(true);
  });

  it("bid 更新でログが生成される（「Y 手に更新」）", () => {
    const prevState = makeMinimalState({
      phase: "bidding",
      bids: [{ playerId: "p1", count: 5, orderId: 0 }],
    });
    const newState = makeMinimalState({
      phase: "bidding",
      bids: [{ playerId: "p1", count: 3, orderId: 1 }],
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    expect(logs.some((e) => e.playerId === "p1" && e.message === "3 手に更新")).toBe(true);
  });

  it("bidding→solving で「解決開始（N 手）」ログが生成される", () => {
    const prevState = makeMinimalState({
      phase: "bidding",
      bids: [{ playerId: "p1", count: 4, orderId: 0 }],
      currentBidIndex: 0,
    });
    const newState = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p1", count: 4, orderId: 0 }],
      currentBidIndex: 0,
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    expect(logs.some((e) => e.message === "解決開始（4 手）")).toBe(true);
  });
});

describe("getLogEntries - ロボット移動ログ", () => {
  function makeRobotPositions(redCol: number): Record<RobotColor, { row: number; col: number }> {
    return {
      red: { row: 5, col: redCol },
      yellow: { row: 0, col: 1 },
      green: { row: 1, col: 1 },
      blue: { row: 2, col: 1 },
      silver: { row: 3, col: 1 },
    };
  }

  it("通常 solving 中の移動（Case A）でログが生成される", () => {
    // sameSolver かつ moveCount が増加
    const prevState = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
      moveCount: 0,
      robots: makeRobotPositions(3),
    });
    const newState = makeMinimalState({
      phase: "solving",
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
      moveCount: 1,
      robots: makeRobotPositions(9), // red が右へ移動
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    const moveLog = logs.find((e) => e.message.includes("へ移動"));
    expect(moveLog).toBeDefined();
    expect(moveLog!.playerId).toBe("p1");
    expect(moveLog!.metadata?.robotColor).toBe("red");
  });

  it("手数上限到達で nextSolver が呼ばれた最後の移動（Case B）でもログが生成される", () => {
    // prevState.moveCount + 1 >= prevBid.count かつ !sameSolver
    const prevState = makeMinimalState({
      phase: "solving",
      bids: [
        { playerId: "p1", count: 2, orderId: 0 },
        { playerId: "p2", count: 3, orderId: 1 },
      ],
      currentBidIndex: 0,
      moveCount: 1, // isLastAllowedMove: 1+1 >= 2 = true
      robots: makeRobotPositions(3),
    });
    const newState = makeMinimalState({
      phase: "solving",
      bids: [
        { playerId: "p1", count: 2, orderId: 0 },
        { playerId: "p2", count: 3, orderId: 1 },
      ],
      currentBidIndex: 1, // nextSolver で交代 → !sameSolver
      moveCount: 0,
      robots: makeRobotPositions(3), // snapshot にリセット済み
      lastFailureRobots: makeRobotPositions(9), // 移動後の失敗位置
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    const moveLog = logs.find((e) => e.message.includes("へ移動"));
    expect(moveLog).toBeDefined();
    expect(moveLog!.playerId).toBe("p1");
  });

  it("give-up では移動ログが生成されない", () => {
    const robots = {
      red: { row: 5, col: 5 },
      yellow: { row: 0, col: 1 },
      green: { row: 1, col: 1 },
      blue: { row: 2, col: 1 },
      silver: { row: 3, col: 1 },
    };
    const prevState = makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      bids: [
        { playerId: "p1", count: 3, orderId: 0 },
        { playerId: "p2", count: 4, orderId: 1 },
      ],
      currentBidIndex: 0,
      moveCount: 0,
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots,
      robotsSnapshot: robots,
    });
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "give-up" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    // give-up ではロボットが動かないのでロボット移動ログは生成されない
    expect(logs.find((e) => e.message.includes("へ移動"))).toBeUndefined();
  });
});

describe("getLogEntries - チップ獲得", () => {
  it("チップ獲得時に獲得ログが生成される（tag: 獲得、chips 数）", () => {
    // chips が増加した状態遷移を手作り
    const sampleTarget: TargetMark = { id: 1, position: { row: 5, col: 5 }, color: "red" };
    const prevState = makeMinimalState({
      chips: { p1: 0, p2: 0 },
      allTargets: [sampleTarget, { id: 2, position: { row: 3, col: 3 }, color: "blue" }],
      wonTargets: {},
    });
    const newState = makeMinimalState({
      chips: { p1: 1, p2: 0 },
      allTargets: [sampleTarget, { id: 2, position: { row: 3, col: 3 }, color: "blue" }],
      wonTargets: { p1: [1] },
    });
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    const chipLog = logs.find((e) => e.tag === "獲得");
    expect(chipLog).toBeDefined();
    expect(chipLog!.playerId).toBe("p1");
    // "を獲得！（計 1 枚）" のように計枚数を含む
    expect(chipLog!.message).toContain("1 枚");
  });
});

describe("getLogEntries - 全員失敗ログ", () => {
  function makeAllFailedSolvingState(isRetry: boolean) {
    const robots = {
      red: { row: 5, col: 5 },
      yellow: { row: 0, col: 1 },
      green: { row: 1, col: 1 },
      blue: { row: 2, col: 1 },
      silver: { row: 3, col: 1 },
    };
    return makeMinimalState({
      phase: "solving",
      biddingOpen: false,
      isRetry,
      bids: [{ playerId: "p1", count: 3, orderId: 0 }],
      currentBidIndex: 0,
      moveCount: 0,
      currentTarget: { id: 1, position: { row: 10, col: 10 }, color: "blue" },
      targetRobotLeftTarget: true,
      robots,
      robotsSnapshot: robots,
    });
  }

  it("1回目全員失敗で「全員失敗。再宣言」ログが生成される", () => {
    const prevState = makeAllFailedSolvingState(false);
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "give-up" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    // "失敗" タグと"全員失敗"メッセージを含む
    expect(logs.some((e) => e.tag === "失敗" && e.message.includes("全員失敗"))).toBe(true);
  });

  it("リトライ中の全員失敗で「リトライも全員失敗。次のターゲットへ」ログが生成される", () => {
    const prevState = makeAllFailedSolvingState(true);
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "give-up" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    // "スキップ" タグと"リトライも全員失敗"メッセージを含む
    expect(logs.some((e) => e.tag === "スキップ" && e.message.includes("リトライも全員失敗"))).toBe(true);
  });
});

describe("getLogEntries - skip-target リグレッション", () => {
  // 制御しやすいターゲット付き bidding 状態を作るヘルパー
  function makeSkipTargetBiddingState(currentTargetId: number) {
    const currentTarget: TargetMark = { id: currentTargetId, position: { row: 5, col: 5 }, color: "red" };
    const nextTarget: TargetMark = { id: currentTargetId + 1, position: { row: 3, col: 3 }, color: "blue" };
    return makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
      currentTarget,
      remainingTargets: [nextTarget],
      allTargets: [currentTarget, nextTarget],
    });
  }

  it("明示的 skip-target（biddingOpen=true, bids=0）でスキップログが生成される", () => {
    const prevState = makeSkipTargetBiddingState(10);
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "skip-target" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    // ターゲットが変わって bids=0 の bidding→bidding 遷移 → スキップログ
    expect(logs.some((e) => e.message === "時間切れ。次のターゲットへ")).toBe(true);
  });

  it("revealing→next-target ではスキップログが生成されない（バグリグレッション）", () => {
    // revealing フェーズから next-target でターゲットが進む場合はスキップではない
    const prevTarget: TargetMark = { id: 20, position: { row: 5, col: 5 }, color: "red" };
    const nextTarget: TargetMark = { id: 21, position: { row: 3, col: 3 }, color: "blue" };
    const prevState = makeMinimalState({
      phase: "revealing",
      currentTarget: prevTarget,
      revealingTarget: prevTarget,
      revealingPlayer: "p1",
      remainingTargets: [nextTarget],
      allTargets: [prevTarget, nextTarget],
    });
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "next-target" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    // revealing フェーズからの遷移ではスキップログは生成されない
    expect(logs.some((e) => e.message === "時間切れ。次のターゲットへ")).toBe(false);
  });

  it("end-bidding 自動スキップ（bids=0）でもスキップログが生成される", () => {
    const prevState = makeSkipTargetBiddingState(30);
    const newState = hyperRobotDefinition.applyMove(prevState, { type: "end-bidding" }, "p1");
    const logs = hyperRobotDefinition.getLogEntries!(prevState, newState);
    expect(logs.some((e) => e.message === "時間切れ。次のターゲットへ")).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// getRanking - 3人以上
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("getRanking - 3人以上", () => {
  it("3人で chips が全て異なる → 降順ランキング配列", () => {
    const state = makeMinimalState({
      phase: "finished",
      chips: { p1: 5, p2: 2, p3: 8 },
      playerIds: ["p1", "p2", "p3"],
    });
    const ranking = hyperRobotDefinition.getRanking(state);
    // 8 > 5 > 2 の順
    expect(ranking).toEqual(["p3", "p1", "p2"]);
  });

  it("3人中 2・3位が同 chips → null（引き分け扱い）", () => {
    const state = makeMinimalState({
      phase: "finished",
      chips: { p1: 8, p2: 3, p3: 3 },
      playerIds: ["p1", "p2", "p3"],
    });
    const ranking = hyperRobotDefinition.getRanking(state);
    // p2 と p3 が同値 → 引き分けのグループがある → null
    expect(ranking).toBeNull();
  });
});
