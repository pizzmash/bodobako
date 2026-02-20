import { describe, it, expect } from "vitest";
import { citychaseDefinition } from "../definition.js";
import type { CitychaseState } from "../types.js";

const HOST = "host";
const P1 = "player1";
const P2 = "player2";
const P3 = "player3";

function makeFullGameState(overrides: Partial<CitychaseState> = {}): CitychaseState {
  return {
    ...citychaseDefinition.createInitialState([HOST, P1], HOST),
    phase: "police-turn",
    criminalId: P1,
    policeIds: [HOST],
    helicopterAssignments: [HOST, HOST, HOST],
    helicopters: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    criminalPos: { row: 2, col: 2 },
    traces: { "2,2": 1 },
    round: 1,
    currentPoliceIndex: 0,
    currentHelicopterIndex: 0,
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("playerIdsとhostIdが正しく設定される", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1, P2], HOST);
    expect(state.playerIds).toEqual([HOST, P1, P2]);
    expect(state.hostId).toBe(HOST);
  });

  it("hostId省略時はplayerIds[0]がhost", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(state.hostId).toBe(HOST);
  });

  it("初期フェーズはrole-select", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(state.phase).toBe("role-select");
  });

  it("初期状態でhorizontalは3基すべてnull", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(state.helicopters).toHaveLength(3);
    expect(state.helicopters.every((h) => h === null)).toBe(true);
  });

  it("finished=falseで始まる", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(state.finished).toBe(false);
  });
});

describe("parseMove", () => {
  it("assign-criminalを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({ type: "assign-criminal", targetId: P1 });
    expect(move).toEqual({ type: "assign-criminal", targetId: P1 });
  });

  it("place-helicopterを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({ type: "place-helicopter", pos: { row: 1, col: 2 } });
    expect(move).toEqual({ type: "place-helicopter", pos: { row: 1, col: 2 } });
  });

  it("place-criminalを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({ type: "place-criminal", pos: { row: 3, col: 3 } });
    expect(move).toEqual({ type: "place-criminal", pos: { row: 3, col: 3 } });
  });

  it("move-helicopterを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({
      type: "move-helicopter",
      helicopterIndex: 0,
      pos: { row: 1, col: 1 },
    });
    expect(move).toEqual({ type: "move-helicopter", helicopterIndex: 0, pos: { row: 1, col: 1 } });
  });

  it("search-buildingを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({
      type: "search-building",
      helicopterIndex: 2,
      pos: { row: 2, col: 2 },
    });
    expect(move).toEqual({ type: "search-building", helicopterIndex: 2, pos: { row: 2, col: 2 } });
  });

  it("move-criminalを正しくパースする", () => {
    const move = citychaseDefinition.parseMove!({ type: "move-criminal", pos: { row: 1, col: 2 } });
    expect(move).toEqual({ type: "move-criminal", pos: { row: 1, col: 2 } });
  });

  it("不明なtypeはnull", () => {
    expect(citychaseDefinition.parseMove!({ type: "unknown" })).toBeNull();
  });

  it("nullはnull", () => {
    expect(citychaseDefinition.parseMove!(null)).toBeNull();
  });

  it("posが不正な場合はnull", () => {
    expect(citychaseDefinition.parseMove!({ type: "place-helicopter", pos: "invalid" })).toBeNull();
    expect(citychaseDefinition.parseMove!({ type: "place-helicopter", pos: { row: "a", col: 0 } })).toBeNull();
  });

  it("helicopterIndexが整数でない場合はnull", () => {
    expect(citychaseDefinition.parseMove!({ type: "move-helicopter", helicopterIndex: 1.5, pos: { row: 0, col: 0 } })).toBeNull();
  });
});

describe("validateMove - role-select フェーズ", () => {
  it("ホストが有効なプレイヤーを犯人に指名できる", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    expect(
      citychaseDefinition.validateMove(state, { type: "assign-criminal", targetId: P1 }, HOST)
    ).toBe(true);
  });

  it("ホスト以外は犯人を指名できない", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    expect(
      citychaseDefinition.validateMove(state, { type: "assign-criminal", targetId: HOST }, P1)
    ).toBe(false);
  });

  it("playerIdsにいないプレイヤーは指名できない", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    expect(
      citychaseDefinition.validateMove(state, { type: "assign-criminal", targetId: "unknown" }, HOST)
    ).toBe(false);
  });

  it("role-selectフェーズにplace-helicopterは不可", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    expect(
      citychaseDefinition.validateMove(state, { type: "place-helicopter", pos: { row: 0, col: 0 } }, HOST)
    ).toBe(false);
  });
});

describe("validateMove - police-setup フェーズ", () => {
  it("担当プレイヤーが有効な交差点にヘリを置ける", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    const state2 = citychaseDefinition.applyMove(state, { type: "assign-criminal", targetId: P1 }, HOST);
    // police-setup フェーズ
    expect(
      citychaseDefinition.validateMove(state2, { type: "place-helicopter", pos: { row: 0, col: 0 } }, HOST)
    ).toBe(true);
  });
});

describe("validateMove - police-turn フェーズ", () => {
  it("現在のプレイヤーがヘリを隣接交差点に移動できる", () => {
    const state = makeFullGameState({
      helicopters: [{ row: 1, col: 1 }, null, null],
      currentHelicopterIndex: 0,
    });
    // (1,1)から(0,1)への移動（隣接）
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "move-helicopter", helicopterIndex: 0, pos: { row: 0, col: 1 } },
        HOST
      )
    ).toBe(true);
  });

  it("非隣接の交差点への移動は不可", () => {
    const state = makeFullGameState({
      helicopters: [{ row: 1, col: 1 }, null, null],
      currentHelicopterIndex: 0,
    });
    // (1,1)から(3,3)への移動（非隣接）
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "move-helicopter", helicopterIndex: 0, pos: { row: 3, col: 3 } },
        HOST
      )
    ).toBe(false);
  });

  it("ヘリの周囲ビルを捜索できる", () => {
    const state = makeFullGameState({
      helicopters: [{ row: 1, col: 1 }, null, null],
      currentHelicopterIndex: 0,
    });
    // (1,1)交差点を囲む(1,1)ビルを捜索
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "search-building", helicopterIndex: 0, pos: { row: 1, col: 1 } },
        HOST
      )
    ).toBe(true);
  });

  it("ヘリの周囲以外のビルは捜索できない", () => {
    const state = makeFullGameState({
      helicopters: [{ row: 1, col: 1 }, null, null],
      currentHelicopterIndex: 0,
    });
    // (1,1)交差点の周囲ではない(4,4)ビル
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "search-building", helicopterIndex: 0, pos: { row: 4, col: 4 } },
        HOST
      )
    ).toBe(false);
  });
});

describe("validateMove - criminal-turn フェーズ", () => {
  it("犯人が痕跡なしの隣接ビルに移動できる", () => {
    const state = makeFullGameState({
      phase: "criminal-turn",
      criminalPos: { row: 2, col: 2 },
      traces: { "2,2": 1 }, // 現在地のみ痕跡
    });
    // (2,2)から(2,3)に移動（隣接、痕跡なし）
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "move-criminal", pos: { row: 2, col: 3 } },
        P1
      )
    ).toBe(true);
  });

  it("犯人は痕跡のあるビルには移動できない", () => {
    const state = makeFullGameState({
      phase: "criminal-turn",
      criminalPos: { row: 2, col: 2 },
      traces: { "2,2": 1, "2,3": 2 }, // (2,3)に痕跡あり
    });
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "move-criminal", pos: { row: 2, col: 3 } },
        P1
      )
    ).toBe(false);
  });

  it("警察は犯人のターンに動けない", () => {
    const state = makeFullGameState({
      phase: "criminal-turn",
    });
    expect(
      citychaseDefinition.validateMove(
        state,
        { type: "move-criminal", pos: { row: 2, col: 3 } },
        HOST
      )
    ).toBe(false);
  });
});

describe("applyMove - role-select → police-setup", () => {
  it("犯人指名でpolice-setupフェーズに移行する", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    const newState = citychaseDefinition.applyMove(
      state,
      { type: "assign-criminal", targetId: P1 },
      HOST
    );
    expect(newState.phase).toBe("police-setup");
    expect(newState.criminalId).toBe(P1);
    expect(newState.policeIds).toContain(HOST);
    expect(newState.policeIds).not.toContain(P1);
  });
});

describe("getStatus", () => {
  it("finished=falseなら'playing'", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(citychaseDefinition.getStatus(state)).toBe("playing");
  });

  it("finished=trueなら'finished'", () => {
    const state = makeFullGameState({ finished: true, winningSide: "police" });
    expect(citychaseDefinition.getStatus(state)).toBe("finished");
  });
});

describe("getRanking", () => {
  it("警察陣営勝利: 警察が1位、犯人が最下位", () => {
    const state = makeFullGameState({
      finished: true,
      winningSide: "police",
    });
    const ranking = citychaseDefinition.getRanking(state);
    expect(ranking![0]).toBe(HOST); // 警察が1位
    expect(ranking![ranking!.length - 1]).toBe(P1); // 犯人が最下位
  });

  it("犯人勝利: 犯人が1位、警察が最下位", () => {
    const state = makeFullGameState({
      finished: true,
      winningSide: "criminal",
    });
    const ranking = citychaseDefinition.getRanking(state);
    expect(ranking![0]).toBe(P1); // 犯人が1位
    expect(ranking![ranking!.length - 1]).toBe(HOST); // 警察が最下位
  });

  it("criminalIdがnullならnull", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1]);
    expect(citychaseDefinition.getRanking(state)).toBeNull();
  });
});

describe("getPlayerView", () => {
  it("犯人視点では全情報が公開される（isCriminal=true）", () => {
    const state = makeFullGameState();
    const view = citychaseDefinition.getPlayerView!(state, P1); // P1=criminal
    expect((view as any).isCriminal).toBe(true);
    expect((view as any).criminalPos).toEqual({ row: 2, col: 2 });
    expect(Object.keys((view as any).traces)).toHaveLength(1);
  });

  it("警察視点では犯人位置と痕跡が隠される（isCriminal=false）", () => {
    const state = makeFullGameState();
    const view = citychaseDefinition.getPlayerView!(state, HOST); // HOST=police
    expect((view as any).isCriminal).toBe(false);
    expect((view as any).criminalPos).toBeNull();
    expect(Object.keys((view as any).traces)).toHaveLength(0);
  });

  it("ゲーム終了後は警察にも犯人情報が公開される", () => {
    const state = makeFullGameState({ finished: true, winningSide: "police" });
    const view = citychaseDefinition.getPlayerView!(state, HOST);
    expect((view as any).isCriminal).toBe(false);
    // 終了後は公開
    expect((view as any).criminalPos).toEqual({ row: 2, col: 2 });
  });
});

describe("getCurrentPlayerId", () => {
  it("role-selectフェーズはhostIdを返す", () => {
    const state = citychaseDefinition.createInitialState([HOST, P1], HOST);
    expect(citychaseDefinition.getCurrentPlayerId(state)).toBe(HOST);
  });

  it("criminal-turnフェーズはcriminalIdを返す", () => {
    const state = makeFullGameState({ phase: "criminal-turn" });
    expect(citychaseDefinition.getCurrentPlayerId(state)).toBe(P1);
  });

  it("police-turnフェーズは現在の警察プレイヤーを返す", () => {
    const state = makeFullGameState({ phase: "police-turn", currentPoliceIndex: 0 });
    expect(citychaseDefinition.getCurrentPlayerId(state)).toBe(HOST);
  });
});
