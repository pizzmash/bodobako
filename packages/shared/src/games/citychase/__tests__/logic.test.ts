import { describe, it, expect } from "vitest";
import {
  posKey,
  parsePos,
  isSamePos,
  getAdjacentBuildings,
  getAdjacentIntersections,
  getSurroundingBuildings,
  isValidBuildingPos,
  isValidIntersectionPos,
  isOccupiedIntersection,
  isAdjacentIntersection,
  isAdjacentBuilding,
  isBuildingSurroundingIntersection,
  getValidCriminalMoves,
  canCriminalMove,
  assignHelicopters,
  getHelicoptersForPlayer,
  advancePolice,
  shouldRevealRound,
  createRevealedTrace,
  BOARD_SIZE,
  INTERSECTION_SIZE,
} from "../logic.js";
import type { CitychaseState, BuildingPos, IntersectionPos } from "../types.js";

// テスト用の最低限のCitychaseStateを生成
function makeBaseState(overrides: Partial<CitychaseState> = {}): CitychaseState {
  return {
    playerIds: ["p1", "p2"],
    phase: "police-turn",
    round: 1,
    criminalId: "p1",
    policeIds: ["p2"],
    hostId: "p2",
    helicopters: [null, null, null],
    helicopterAssignments: ["p2", "p2", "p2"],
    criminalPos: { row: 2, col: 2 },
    traces: { "2,2": 1 },
    revealedTraces: [],
    searchedEmpty: [],
    lastSearchResult: null,
    currentPoliceIndex: 0,
    currentHelicopterIndex: 0,
    finished: false,
    winningSide: null,
    ...overrides,
  };
}

describe("posKey", () => {
  it("BuildingPosをキー文字列に変換する", () => {
    expect(posKey({ row: 0, col: 0 })).toBe("0,0");
    expect(posKey({ row: 2, col: 3 })).toBe("2,3");
    expect(posKey({ row: 4, col: 4 })).toBe("4,4");
  });
});

describe("parsePos", () => {
  it("キー文字列からBuildingPosに変換する", () => {
    expect(parsePos("0,0")).toEqual({ row: 0, col: 0 });
    expect(parsePos("2,3")).toEqual({ row: 2, col: 3 });
    expect(parsePos("4,4")).toEqual({ row: 4, col: 4 });
  });

  it("posKeyとparsePositionは往復一致する", () => {
    const pos: BuildingPos = { row: 3, col: 1 };
    expect(parsePos(posKey(pos))).toEqual(pos);
  });
});

describe("isSamePos", () => {
  it("同じ座標のオブジェクトはtrueを返す", () => {
    expect(isSamePos({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true);
  });

  it("異なる座標はfalseを返す", () => {
    expect(isSamePos({ row: 1, col: 2 }, { row: 1, col: 3 })).toBe(false);
    expect(isSamePos({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(false);
  });

  it("nullを含む場合はfalseを返す", () => {
    expect(isSamePos(null, { row: 1, col: 2 })).toBe(false);
    expect(isSamePos({ row: 1, col: 2 }, null)).toBe(false);
    expect(isSamePos(null, null)).toBe(false);
  });
});

describe("getAdjacentBuildings", () => {
  it("中央(2,2)には4つの隣接ビルがある", () => {
    const adj = getAdjacentBuildings({ row: 2, col: 2 });
    expect(adj).toHaveLength(4);
    expect(adj).toContainEqual({ row: 1, col: 2 });
    expect(adj).toContainEqual({ row: 3, col: 2 });
    expect(adj).toContainEqual({ row: 2, col: 1 });
    expect(adj).toContainEqual({ row: 2, col: 3 });
  });

  it("角(0,0)には2つの隣接ビルがある", () => {
    const adj = getAdjacentBuildings({ row: 0, col: 0 });
    expect(adj).toHaveLength(2);
    expect(adj).toContainEqual({ row: 1, col: 0 });
    expect(adj).toContainEqual({ row: 0, col: 1 });
  });

  it("辺(0,2)には3つの隣接ビルがある", () => {
    const adj = getAdjacentBuildings({ row: 0, col: 2 });
    expect(adj).toHaveLength(3);
  });

  it("隣接ビルは常にBOARD_SIZE内に収まる", () => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const adj = getAdjacentBuildings({ row: r, col: c });
        adj.forEach((p) => {
          expect(p.row).toBeGreaterThanOrEqual(0);
          expect(p.row).toBeLessThan(BOARD_SIZE);
          expect(p.col).toBeGreaterThanOrEqual(0);
          expect(p.col).toBeLessThan(BOARD_SIZE);
        });
      }
    }
  });
});

describe("getAdjacentIntersections", () => {
  it("交差点中央(1,1)には4つの隣接交差点がある", () => {
    const adj = getAdjacentIntersections({ row: 1, col: 1 });
    expect(adj).toHaveLength(4);
  });

  it("交差点角(0,0)には2つの隣接交差点がある", () => {
    const adj = getAdjacentIntersections({ row: 0, col: 0 });
    expect(adj).toHaveLength(2);
  });

  it("隣接交差点は常にINTERSECTION_SIZE内", () => {
    for (let r = 0; r < INTERSECTION_SIZE; r++) {
      for (let c = 0; c < INTERSECTION_SIZE; c++) {
        const adj = getAdjacentIntersections({ row: r, col: c });
        adj.forEach((p) => {
          expect(p.row).toBeGreaterThanOrEqual(0);
          expect(p.row).toBeLessThan(INTERSECTION_SIZE);
          expect(p.col).toBeGreaterThanOrEqual(0);
          expect(p.col).toBeLessThan(INTERSECTION_SIZE);
        });
      }
    }
  });
});

describe("getSurroundingBuildings", () => {
  it("交差点(1,1)を囲む4ビルを返す", () => {
    const buildings = getSurroundingBuildings({ row: 1, col: 1 });
    expect(buildings).toHaveLength(4);
    expect(buildings).toContainEqual({ row: 1, col: 1 });
    expect(buildings).toContainEqual({ row: 1, col: 2 });
    expect(buildings).toContainEqual({ row: 2, col: 1 });
    expect(buildings).toContainEqual({ row: 2, col: 2 });
  });

  it("交差点(0,0)を囲む4ビルを返す（角）", () => {
    const buildings = getSurroundingBuildings({ row: 0, col: 0 });
    expect(buildings).toContainEqual({ row: 0, col: 0 });
    expect(buildings).toContainEqual({ row: 0, col: 1 });
    expect(buildings).toContainEqual({ row: 1, col: 0 });
    expect(buildings).toContainEqual({ row: 1, col: 1 });
  });
});

describe("isValidBuildingPos", () => {
  it("0〜4の範囲内はtrue", () => {
    expect(isValidBuildingPos({ row: 0, col: 0 })).toBe(true);
    expect(isValidBuildingPos({ row: 4, col: 4 })).toBe(true);
    expect(isValidBuildingPos({ row: 2, col: 2 })).toBe(true);
  });

  it("範囲外はfalse", () => {
    expect(isValidBuildingPos({ row: -1, col: 0 })).toBe(false);
    expect(isValidBuildingPos({ row: 5, col: 0 })).toBe(false);
    expect(isValidBuildingPos({ row: 0, col: 5 })).toBe(false);
  });

  it("小数はfalse", () => {
    expect(isValidBuildingPos({ row: 1.5, col: 0 })).toBe(false);
  });
});

describe("isValidIntersectionPos", () => {
  it("0〜3の範囲内はtrue", () => {
    expect(isValidIntersectionPos({ row: 0, col: 0 })).toBe(true);
    expect(isValidIntersectionPos({ row: 3, col: 3 })).toBe(true);
  });

  it("4以上はfalse", () => {
    expect(isValidIntersectionPos({ row: 4, col: 0 })).toBe(false);
    expect(isValidIntersectionPos({ row: 0, col: 4 })).toBe(false);
  });
});

describe("isOccupiedIntersection", () => {
  const heliPos: IntersectionPos = { row: 1, col: 1 };

  it("同じ位置にヘリがあればtrue", () => {
    expect(isOccupiedIntersection([heliPos, null, null], { row: 1, col: 1 })).toBe(true);
  });

  it("ヘリがなければfalse", () => {
    expect(isOccupiedIntersection([null, null, null], { row: 1, col: 1 })).toBe(false);
  });

  it("excludeIndexを指定したヘリは除外される", () => {
    // index=0のヘリを除外して同じ位置をチェック
    expect(isOccupiedIntersection([heliPos, null, null], { row: 1, col: 1 }, 0)).toBe(false);
  });
});

describe("isAdjacentIntersection", () => {
  it("上下左右に隣接する交差点はtrue", () => {
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 2, col: 1 })).toBe(true);
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 1, col: 0 })).toBe(true);
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
  });

  it("斜めや2マス以上離れた交差点はfalse", () => {
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 0, col: 0 })).toBe(false); // 斜め
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 3, col: 1 })).toBe(false); // 2マス
  });

  it("同じ位置はfalse", () => {
    expect(isAdjacentIntersection({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
  });
});

describe("isAdjacentBuilding", () => {
  it("上下左右に隣接するビルはtrue", () => {
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 1, col: 2 })).toBe(true);
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 3, col: 2 })).toBe(true);
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 2, col: 1 })).toBe(true);
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 2, col: 3 })).toBe(true);
  });

  it("斜めや2マス離れたビルはfalse", () => {
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 1, col: 1 })).toBe(false);
    expect(isAdjacentBuilding({ row: 2, col: 2 }, { row: 4, col: 2 })).toBe(false);
  });
});

describe("isBuildingSurroundingIntersection", () => {
  it("交差点(1,1)を囲む4ビルはtrue", () => {
    expect(isBuildingSurroundingIntersection({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(true);
    expect(isBuildingSurroundingIntersection({ row: 1, col: 2 }, { row: 1, col: 1 })).toBe(true);
    expect(isBuildingSurroundingIntersection({ row: 2, col: 1 }, { row: 1, col: 1 })).toBe(true);
    expect(isBuildingSurroundingIntersection({ row: 2, col: 2 }, { row: 1, col: 1 })).toBe(true);
  });

  it("交差点を囲まないビルはfalse", () => {
    expect(isBuildingSurroundingIntersection({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
    expect(isBuildingSurroundingIntersection({ row: 3, col: 3 }, { row: 1, col: 1 })).toBe(false);
  });
});

describe("getValidCriminalMoves", () => {
  it("criminalPosがnullなら空配列", () => {
    const state = makeBaseState({ criminalPos: null });
    expect(getValidCriminalMoves(state)).toHaveLength(0);
  });

  it("痕跡なしの隣接ビルのリストを返す", () => {
    const state = makeBaseState({
      criminalPos: { row: 2, col: 2 },
      traces: { "2,2": 1 }, // 現在位置は痕跡あり（移動後の痕跡が設定されている場合）
    });
    const moves = getValidCriminalMoves(state);
    // (2,2)の隣接ビルは(1,2),(3,2),(2,1),(2,3)
    // 痕跡があるのは(2,2)のみ、隣接ビルに痕跡はない
    expect(moves).toHaveLength(4);
  });

  it("痕跡のある隣接ビルは移動先から除外される", () => {
    const state = makeBaseState({
      criminalPos: { row: 2, col: 2 },
      traces: { "2,2": 1, "1,2": 1 }, // (1,2)にも痕跡あり
    });
    const moves = getValidCriminalMoves(state);
    // (1,2)が除外される
    expect(moves).toHaveLength(3);
    expect(moves).not.toContainEqual({ row: 1, col: 2 });
  });
});

describe("canCriminalMove", () => {
  it("移動可能なビルがあればtrue", () => {
    const state = makeBaseState({
      criminalPos: { row: 2, col: 2 },
      traces: {},
    });
    expect(canCriminalMove(state)).toBe(true);
  });

  it("移動可能なビルがなければfalse（四方が痕跡）", () => {
    const state = makeBaseState({
      criminalPos: { row: 2, col: 2 },
      traces: {
        "1,2": 1,
        "3,2": 2,
        "2,1": 3,
        "2,3": 4,
      },
    });
    expect(canCriminalMove(state)).toBe(false);
  });
});

describe("assignHelicopters", () => {
  it("警察1人のとき3基すべてを担当", () => {
    const assignments = assignHelicopters(["p1"]);
    expect(assignments).toHaveLength(3);
    expect(assignments.every((id) => id === "p1")).toBe(true);
  });

  it("警察2人のとき合計3基（1人が2基、1人が1基）", () => {
    const assignments = assignHelicopters(["p1", "p2"]);
    expect(assignments).toHaveLength(3);
    const p1Count = assignments.filter((id) => id === "p1").length;
    const p2Count = assignments.filter((id) => id === "p2").length;
    expect(p1Count + p2Count).toBe(3);
    // 1人が2基、1人が1基
    expect([p1Count, p2Count].sort()).toEqual([1, 2]);
  });

  it("警察3人のとき1基ずつ担当", () => {
    const assignments = assignHelicopters(["p1", "p2", "p3"]);
    expect(assignments).toHaveLength(3);
    // 各プレイヤーが1基ずつ
    expect(assignments.filter((id) => id === "p1")).toHaveLength(1);
    expect(assignments.filter((id) => id === "p2")).toHaveLength(1);
    expect(assignments.filter((id) => id === "p3")).toHaveLength(1);
  });
});

describe("getHelicoptersForPlayer", () => {
  it("担当ヘリのインデックスリストを返す", () => {
    const assignments = ["p1", "p1", "p2"]; // p1が0,1番; p2が2番
    expect(getHelicoptersForPlayer(assignments, "p1")).toEqual([0, 1]);
    expect(getHelicoptersForPlayer(assignments, "p2")).toEqual([2]);
  });

  it("担当がないプレイヤーは空配列", () => {
    const assignments = ["p1", "p1", "p1"];
    expect(getHelicoptersForPlayer(assignments, "p2")).toEqual([]);
  });
});

describe("advancePolice", () => {
  it("同プレイヤーに次のヘリがある場合はそのヘリに進む", () => {
    // p1が0,1番ヘリを担当、現在p1の0番ヘリ
    const state = makeBaseState({
      policeIds: ["p1"],
      helicopterAssignments: ["p1", "p1", "p1"],
      currentPoliceIndex: 0,
      currentHelicopterIndex: 0,
    });
    const next = advancePolice(state);
    expect(next).not.toBeNull();
    expect(next!.policeIndex).toBe(0); // 同じプレイヤー
    expect(next!.heliIndex).toBe(1); // 次のヘリ
  });

  it("最後のヘリが完了したらnullを返す（単プレイヤー最後のヘリ）", () => {
    const state = makeBaseState({
      policeIds: ["p1"],
      helicopterAssignments: ["p1", "p1", "p1"],
      currentPoliceIndex: 0,
      currentHelicopterIndex: 2, // 最後のヘリ
    });
    const next = advancePolice(state);
    expect(next).toBeNull();
  });

  it("複数プレイヤーで次のプレイヤーに進む", () => {
    // p1が0番、p2が1,2番担当
    const state = makeBaseState({
      policeIds: ["p1", "p2"],
      helicopterAssignments: ["p1", "p2", "p2"],
      currentPoliceIndex: 0, // p1
      currentHelicopterIndex: 0, // p1の0番ヘリ（p1はこれだけ）
    });
    const next = advancePolice(state);
    expect(next).not.toBeNull();
    expect(next!.policeIndex).toBe(1); // 次はp2
    expect(next!.heliIndex).toBe(1); // p2の最初のヘリ(index=1)
  });
});

describe("shouldRevealRound", () => {
  it("ラウンド1はtrue（開示対象）", () => {
    expect(shouldRevealRound(1)).toBe(true);
  });

  it("ラウンド6はtrue（開示対象）", () => {
    expect(shouldRevealRound(6)).toBe(true);
  });

  it("その他のラウンドはfalse", () => {
    expect(shouldRevealRound(2)).toBe(false);
    expect(shouldRevealRound(3)).toBe(false);
    expect(shouldRevealRound(4)).toBe(false);
    expect(shouldRevealRound(5)).toBe(false);
    expect(shouldRevealRound(7)).toBe(false);
    expect(shouldRevealRound(11)).toBe(false);
  });
});

describe("createRevealedTrace", () => {
  it("ラウンド1の痕跡はroundが1を含む", () => {
    const trace = createRevealedTrace({ row: 2, col: 3 }, 1);
    expect(trace.pos).toEqual({ row: 2, col: 3 });
    expect(trace.round).toBe(1);
  });

  it("ラウンド6の痕跡はroundが6を含む", () => {
    const trace = createRevealedTrace({ row: 1, col: 1 }, 6);
    expect(trace.round).toBe(6);
  });

  it("開示ラウンド以外はroundがnull", () => {
    const trace2 = createRevealedTrace({ row: 0, col: 0 }, 2);
    expect(trace2.round).toBeNull();
    const trace5 = createRevealedTrace({ row: 0, col: 0 }, 5);
    expect(trace5.round).toBeNull();
  });
});
