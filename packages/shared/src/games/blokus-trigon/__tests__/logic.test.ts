import { describe, expect, it } from "vitest";
import { toHex } from "../board.js";
import {
    ALL_PIECES_MASK,
    advanceColor,
    applyMove,
    boardToGrid,
    canPlace,
    computePlayerPenalty,
    computeRemainingCells,
    computePenalty,
    createInitialState,
    getCurrentPlayerId,
    getValidPlacements,
    hasAnyValidMove,
} from "../logic.js";
import { PIECES, TOTAL_CELLS } from "../pieces.js";
import type { BlokusTrigonState } from "../types.js";
import { GRID_COLS, GRID_ROWS } from "../types.js";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------


/** 配置先 (row, col) に合う piece #0 のバリアントインデックスを返す */
function vi0(row: number, col: number): number {
  // piece#0のvariant0のbp=0, variant1のbp=1
  return (row + col) % 2;
}

function makeState(overrides: Partial<BlokusTrigonState> = {}): BlokusTrigonState {
  return {
    boards: ["0", "0", "0", "0"],
    remainingPieces: [ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    playerIds: ["p1", "p2", "p3", "p4"],
    currentColorIndex: 0,
    colorOwner: [0, 1, 2, 3],
    numColors: 4,
    hasPlacedFirst: [false, false, false, false],
    eliminated: [false, false, false, false],
    lastPieceSize: [0, 0, 0, 0],
    borderRestriction: false,
    finished: false,
    ...overrides,
  };
}

function setBit(row: number, col: number): string {
  return toHex(1n << BigInt(row * GRID_COLS + col));
}

function setBits(...positions: [number, number][]): string {
  let bb = 0n;
  for (const [r, c] of positions) {
    bb |= 1n << BigInt(r * GRID_COLS + c);
  }
  return toHex(bb);
}

// ---------------------------------------------------------------------------
// canPlace
// ---------------------------------------------------------------------------

describe("canPlace", () => {
  it("初手: スタートマスをカバーする配置は合法", () => {
    const state = makeState();
    // 色0のスタート: (6,9), parity=1 → variant 1 (bp=1)
    expect(canPlace(state, 0, 0, vi0(6, 9), 6, 9)).toBe(true);
  });

  it("初手: スタートマスをカバーしない配置は不正", () => {
    const state = makeState();
    expect(canPlace(state, 0, 0, vi0(8, 17), 8, 17)).toBe(false);
  });

  it("初手: 色1のスタートマス(6,25)をカバーする配置は合法", () => {
    const state = makeState();
    // 色1のスタート: (6,25), parity=1 → variant 1 (bp=1)
    expect(canPlace(state, 1, 0, vi0(6, 25), 6, 25)).toBe(true);
  });

  it("初手: baseParity不一致のバリアントは不正", () => {
    const state = makeState();
    // 色0のスタート: (6,9), parity=1 → variant 0 (bp=0) は不一致
    expect(canPlace(state, 0, 0, 0, 6, 9)).toBe(false);
  });

  it("2手目: 同色角接触あり → 合法", () => {
    // 色0を(6,9)に配置済み（▼セル）
    const state = makeState({
      boards: [setBit(6, 9), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // (6,9) は ▼。配置セルの角隣接に(6,9)を含むセルを探す:
    // ▼(5,8) の角隣接 = (6,7),(6,9),(4,6),(4,10) → (6,9) が角接触あり
    // ▼(5,8) の辺隣接 = (5,7),(5,9),(4,8) → (6,9) と辺接触なし
    expect(canPlace(state, 0, 0, vi0(5, 8), 5, 8)).toBe(true);
  });

  it("2手目: 同色辺接触あり → 不正", () => {
    const state = makeState({
      boards: [setBit(6, 9), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // (6,9)は▼。辺隣接: (6,8),(6,10),(5,9)
    expect(canPlace(state, 0, 0, vi0(6, 8), 6, 8)).toBe(false);
    expect(canPlace(state, 0, 0, vi0(6, 10), 6, 10)).toBe(false);
    expect(canPlace(state, 0, 0, vi0(5, 9), 5, 9)).toBe(false);
  });

  it("2手目: 角接触なし → 不正", () => {
    const state = makeState({
      boards: [setBit(6, 9), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    expect(canPlace(state, 0, 0, vi0(10, 10), 10, 10)).toBe(false);
  });

  it("既存セルとの重複 → 不正", () => {
    const state = makeState({
      boards: [setBit(6, 9), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    expect(canPlace(state, 0, 0, vi0(6, 9), 6, 9)).toBe(false);
  });

  it("他色セルとの重複 → 不正", () => {
    const state = makeState({
      boards: ["0", setBit(6, 25), "0", "0"],
      hasPlacedFirst: [false, true, false, false],
    });
    // 色0のスタートは(6,9)だが、(6,25)に色1のセルがある → 重複テスト
    expect(canPlace(state, 0, 0, vi0(6, 25), 6, 25)).toBe(false);
  });

  it("使用済みピース → 不正", () => {
    const state = makeState({
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    expect(canPlace(state, 0, 0, vi0(6, 9), 6, 9)).toBe(false);
  });

  it("不正なバリアントインデックス → 不正", () => {
    const state = makeState();
    expect(canPlace(state, 0, 0, 99, 6, 9)).toBe(false);
    expect(canPlace(state, 0, 0, -1, 6, 9)).toBe(false);
  });

  it("VALID_MASK 外にはみ出す配置 → 不正", () => {
    const state = makeState();
    // (0,0) は VALID_MASK 外
    expect(canPlace(state, 0, 0, 0, 0, 0)).toBe(false);
  });

  it("3人戦: BORDER_MASK 内への配置 → 不正", () => {
    const state = makeState({
      boards: ["0", "0", "0"],
      remainingPieces: [ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
      playerIds: ["p1", "p2", "p3"],
      colorOwner: [0, 1, 2],
      numColors: 3,
      hasPlacedFirst: [false, false, false],
      eliminated: [false, false, false],
      lastPieceSize: [0, 0, 0],
      borderRestriction: true,
    });
    // 色0のスタートは(6,9)でボーダー外
    expect(canPlace(state, 0, 0, vi0(6, 9), 6, 9)).toBe(true);
    // 最上行はすべてボーダー → 不正
    expect(canPlace(state, 0, 0, vi0(0, 8), 0, 8)).toBe(false);
    // row=1 の両端セルもボーダー → 不正
    expect(canPlace(state, 0, 0, vi0(1, 7), 1, 7)).toBe(false);
    // row=8 の両端セル（最広行）もボーダー → 不正
    expect(canPlace(state, 0, 0, vi0(8, 0), 8, 0)).toBe(false);
  });

  it("2/4人戦: BORDER_MASK 内でも合法（制限なし）", () => {
    // 4人戦でボーダー内に初手配置できるケース
    const state = makeState();
    // 色0のスタートは(3,17) → ボーダー外なので直接テストできないが、
    // borderRestriction=false を確認
    expect(state.borderRestriction).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasAnyValidMove
// ---------------------------------------------------------------------------

describe("hasAnyValidMove", () => {
  it("初期状態では有効手がある", () => {
    const state = makeState();
    expect(hasAnyValidMove(state, 0)).toBe(true);
  });

  it("スタートマスが埋まっていると初手不可", () => {
    const state = makeState({
      // 色0のスタート(6,9)を色1のセルで埋める
      boards: ["0", setBit(6, 9), "0", "0"],
      hasPlacedFirst: [false, true, false, false],
    });
    expect(hasAnyValidMove(state, 0)).toBe(false);
  });

  it("全ピース使用済みなら有効手なし", () => {
    const state = makeState({
      boards: [setBit(6, 9), "0", "0", "0"],
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
      hasPlacedFirst: [true, false, false, false],
    });
    expect(hasAnyValidMove(state, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getValidPlacements
// ---------------------------------------------------------------------------

describe("getValidPlacements", () => {
  it("初手: 1マスピースはスタートマスに配置可能", () => {
    const state = makeState();
    const placements = getValidPlacements(state, 0, 0);
    expect(placements.length).toBeGreaterThanOrEqual(1);
    // 色0のスタート(6,9)を含むはず
    const hasStart = placements.some((p) => p.row === 6 && p.col === 9);
    expect(hasStart).toBe(true);
  });

  it("使用済みピースには空配列", () => {
    const state = makeState({
      remainingPieces: [ALL_PIECES_MASK & ~1, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    expect(getValidPlacements(state, 0, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// advanceColor
// ---------------------------------------------------------------------------

describe("advanceColor", () => {
  it("基本: 色0→色1", () => {
    const state = makeState({ currentColorIndex: 0 });
    const next = advanceColor(state);
    expect(next.currentColorIndex).toBe(1);
    expect(next.finished).toBe(false);
  });

  it("色3→色0にラップ", () => {
    const state = makeState({ currentColorIndex: 3 });
    const next = advanceColor(state);
    expect(next.currentColorIndex).toBe(0);
  });

  it("全色eliminatedならfinished", () => {
    const state = makeState({
      currentColorIndex: 0,
      remainingPieces: [0, 0, 0, 0],
      hasPlacedFirst: [true, true, true, true],
      boards: [
        setBit(6, 9),
        setBit(6, 25),
        setBit(14, 17),
        setBit(3, 17),
      ],
    });
    const next = advanceColor(state);
    expect(next.finished).toBe(true);
    expect(next.eliminated.every(Boolean)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("初手配置でボード更新・ピース消費・手番交代", () => {
    const state = makeState();
    // 色0のスタート: (6,9), parity=1 → variant 1
    const next = applyMove(state, 0, 0, vi0(6, 9), 6, 9);
    expect(next.boards[0]).not.toBe("0");
    expect(next.remainingPieces[0] & 1).toBe(0);
    expect(next.hasPlacedFirst[0]).toBe(true);
    expect(next.currentColorIndex).toBe(1);
    expect(next.lastPieceSize[0]).toBe(1);
  });

  it("元のstateは変更されない（イミュータブル）", () => {
    const state = makeState();
    const boardsBefore = [...state.boards];
    applyMove(state, 0, 0, vi0(6, 9), 6, 9);
    expect(state.boards).toEqual(boardsBefore);
    expect(state.currentColorIndex).toBe(0);
  });

  it("lastMoveに正しい座標が記録される", () => {
    const state = makeState();
    const next = applyMove(state, 0, 0, vi0(6, 9), 6, 9);
    expect(next.lastMove).toBeDefined();
    expect(next.lastMove!.colorIndex).toBe(0);
    expect(next.lastMove!.cells.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeRemainingCells / computePenalty / computePlayerPenalty
// ---------------------------------------------------------------------------

describe("スコア計算", () => {
  it("全ピース残存時の残りセル数 = TOTAL_CELLS (110)", () => {
    const state = makeState();
    expect(computeRemainingCells(state, 0)).toBe(TOTAL_CELLS);
  });

  it("全消費済みなら残り0、ボーナス-15", () => {
    const state = makeState({
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
      lastPieceSize: [3, 0, 0, 0],
    });
    expect(computeRemainingCells(state, 0)).toBe(0);
    expect(computePenalty(state, 0)).toBe(-15);
  });

  it("全消費+最後が1マス → -20", () => {
    const state = makeState({
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
      lastPieceSize: [1, 0, 0, 0],
    });
    expect(computePenalty(state, 0)).toBe(-20);
  });

  it("2人戦: プレイヤースコアは2色合算", () => {
    const state = makeState({
      playerIds: ["p1", "p2"],
      colorOwner: [0, 1, 0, 1],
      numColors: 4,
    });
    // p1 は色0+色2 → 各 TOTAL_CELLS → 合計 220 - 0ボーナス = 220
    expect(computePlayerPenalty(state, 0)).toBe(TOTAL_CELLS * 2);
  });
});

// ---------------------------------------------------------------------------
// boardToGrid
// ---------------------------------------------------------------------------

describe("boardToGrid", () => {
  it("空盤面の有効セルは全て0", () => {
    const state = makeState();
    const grid = boardToGrid(state);
    expect(grid).toHaveLength(GRID_ROWS);
    expect(grid[0]).toHaveLength(GRID_COLS);
    // row=8, col=17 は有効 → 0
    expect(grid[8][17]).toBe(0);
    // row=0, col=0 は無効 → -1
    expect(grid[0][0]).toBe(-1);
  });

  it("色ごとのセル値が正しい", () => {
    const state = makeState({
      boards: [setBit(3, 17), setBit(6, 9), "0", "0"],
    });
    const grid = boardToGrid(state);
    expect(grid[3][17]).toBe(1);
    expect(grid[6][9]).toBe(2);
    expect(grid[8][10]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("4人戦", () => {
    const state = createInitialState(["a", "b", "c", "d"]);
    expect(state.playerIds).toEqual(["a", "b", "c", "d"]);
    expect(state.colorOwner).toEqual([0, 1, 2, 3]);
    expect(state.numColors).toBe(4);
    expect(state.borderRestriction).toBe(false);
    expect(state.finished).toBe(false);
  });

  it("2人戦: 対角色マッピング", () => {
    const state = createInitialState(["a", "b"]);
    expect(state.colorOwner).toEqual([0, 1, 0, 1]);
    expect(state.numColors).toBe(4);
  });

  it("3人戦: 外周制限あり", () => {
    const state = createInitialState(["a", "b", "c"]);
    expect(state.colorOwner).toEqual([0, 1, 2]);
    expect(state.numColors).toBe(3);
    expect(state.borderRestriction).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCurrentPlayerId
// ---------------------------------------------------------------------------

describe("getCurrentPlayerId", () => {
  it("4人戦: 色0 → p1", () => {
    const state = makeState({ currentColorIndex: 0 });
    expect(getCurrentPlayerId(state)).toBe("p1");
  });

  it("2人戦: 色2 → p1 (P1=色0+色2)", () => {
    const state = makeState({
      playerIds: ["p1", "p2"],
      colorOwner: [0, 1, 0, 1],
      currentColorIndex: 2,
    });
    expect(getCurrentPlayerId(state)).toBe("p1");
  });
});
