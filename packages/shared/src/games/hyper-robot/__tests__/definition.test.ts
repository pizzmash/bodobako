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
    const state = makeMinimalState({
      phase: "bidding",
      biddingOpen: true,
      bids: [],
      chips: { p1: 0, p2: 0 },
      // ターゲット: red ロボットを (5,5) に移動
      currentTarget: { id: 1, position: { row: 5, col: 10 }, color: "red" },
      targetRobotLeftTarget: true,
      robots: {
        red: { row: 5, col: 3 },
        yellow: { row: 0, col: 0 },
        green: { row: 1, col: 0 },
        blue: { row: 2, col: 0 },
        silver: { row: 3, col: 0 },
      },
    });

    // bid
    let s = hyperRobotDefinition.applyMove(state, { type: "bid", count: 1 }, "p1");
    expect(s.bids).toHaveLength(1);
    expect(s.bids[0]!.playerId).toBe("p1");
    expect(s.bids[0]!.count).toBe(1);

    // end-bidding → solving
    s = hyperRobotDefinition.applyMove(s, { type: "end-bidding" }, "p1");
    expect(s.phase).toBe("solving");
    expect(s.currentBidIndex).toBe(0);

    // move-robot: red を右へ → (5, 10) に到達（右壁なし、他ロボットなし → 15まで行く可能性）
    // target が (5, 10) なので右に動かすと 10 を通過する
    // ただし targetRobotLeftTarget=true なので isTargetAchieved のチェックが必要
    // 実際には red は (5,3) から右 → (5,15) まで行く。target=(5,10) を通過するが止まらない
    // → ターゲット達成にならない
    // テストとしては、ターゲットにちょうど止まるケースを用意する
    // ターゲット (5,5), red (5,3), right wall at (5,5)
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

describe("skip-target", () => {
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
