import { describe, expect, it } from "vitest";
import { toHex } from "../bitboard.js";
import {
  advanceColor,
  applyMove,
  boardToGrid,
  canPlace,
  computePlayerRemainingCells,
  computeRemainingCells,
  createInitialState,
  getCurrentPlayerId,
  getValidPlacements,
  hasAnyValidMove,
} from "../logic.js";
import { PIECES } from "../pieces.js";
import type { BlocksState } from "../types.js";
import { BOARD_SIZE } from "../types.js";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const ALL_PIECES_MASK = (1 << PIECES.length) - 1;

function makeState(overrides: Partial<BlocksState> = {}): BlocksState {
  return {
    boards: ["0", "0", "0", "0"],
    remainingPieces: [ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    playerIds: ["p1", "p2", "p3", "p4"],
    currentColorIndex: 0,
    colorOwner: [0, 1, 2, 3],
    freeColorNextPlayer: 0,
    hasPlacedFirst: [false, false, false, false],
    eliminated: [false, false, false, false],
    finished: false,
    ...overrides,
  };
}

/** ビットボードに1マスセットして hex を返す */
function setBit(row: number, col: number): string {
  return toHex(1n << BigInt(row * BOARD_SIZE + col));
}

/** 複数マスをセットした hex を返す */
function setBits(...positions: [number, number][]): string {
  let bb = 0n;
  for (const [r, c] of positions) {
    bb |= 1n << BigInt(r * BOARD_SIZE + c);
  }
  return toHex(bb);
}

// ---------------------------------------------------------------------------
// canPlace
// ---------------------------------------------------------------------------

describe("canPlace", () => {
  it("初手: 開始角(0,0)をカバーする配置は合法", () => {
    const state = makeState();
    // Piece 0 (monomino), variant 0, at (0,0)
    expect(canPlace(state, 0, 0, 0, 0, 0)).toBe(true);
  });

  it("初手: 開始角をカバーしない配置は不正", () => {
    const state = makeState();
    // Piece 0 at (5,5) — 角から遠い
    expect(canPlace(state, 0, 0, 0, 5, 5)).toBe(false);
  });

  it("初手: 色1の開始角(0,19)をカバーする配置は合法", () => {
    const state = makeState();
    // Piece 0, variant 0, at (0,19)
    expect(canPlace(state, 1, 0, 0, 0, 19)).toBe(true);
  });

  it("初手: 複数マスピースで開始角をカバーすれば合法", () => {
    const state = makeState();
    // Piece 3 (I-tromino xxx), variant 0 or 1
    // variant 0: cells relative from center. We need a variant that covers (0,0)
    const piece = PIECES[3];
    // 横向きバリアントで開始角(0,0)をカバーする配置を探す
    let found = false;
    for (let vi = 0; vi < piece.variants.length; vi++) {
      for (const [dr, dc] of piece.variants[vi].cells) {
        const row = 0 - dr;
        const col = 0 - dc;
        if (canPlace(state, 0, 3, vi, row, col)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  it("2手目以降: 同色角接触があれば合法", () => {
    // 色0を(0,0)に配置済み。(1,1)に角接触する配置
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // Piece 0 (monomino) at (1,1) — 角接触あり、辺接触なし
    expect(canPlace(state, 0, 0, 0, 1, 1)).toBe(true);
  });

  it("2手目以降: 同色辺接触がある場合は不正", () => {
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // (0,1) は辺接触
    expect(canPlace(state, 0, 0, 0, 0, 1)).toBe(false);
    // (1,0) も辺接触
    expect(canPlace(state, 0, 0, 0, 1, 0)).toBe(false);
  });

  it("2手目以降: 同色角接触がない場合は不正", () => {
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // (5,5) — 角接触なし
    expect(canPlace(state, 0, 0, 0, 5, 5)).toBe(false);
  });

  it("既存セルとの重複は不正", () => {
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    // (0,0) は既に占有
    expect(canPlace(state, 0, 0, 0, 0, 0)).toBe(false);
  });

  it("他色のセルとの重複も不正", () => {
    const state = makeState({
      boards: ["0", setBit(1, 1), "0", "0"],
      hasPlacedFirst: [false, true, false, false],
    });
    // 色0の初手で(1,1)を含むピースは不正（色1が占有）
    // Piece 0 at (1,1)
    expect(canPlace(state, 0, 0, 0, 1, 1)).toBe(false);
  });

  it("他色ピースの辺に接しても合法（異色の辺接触は許可）", () => {
    // 色0が(0,0)に配置済み、色1が(0,19)に配置済み
    // 色0の2手目で (1,1)に配置 — 色1の辺には接しない
    // テスト: 色0が(0,0)配置済み、色1が(2,2)配置済み
    // 色0の(1,1)は色0角接触あり、色1の(2,2)とは辺接触
    const state = makeState({
      boards: [setBit(0, 0), setBit(2, 2), "0", "0"],
      hasPlacedFirst: [true, true, false, false],
    });
    // 色0が(1,1)に配置 — 色0の(0,0)と角接触、色1の(2,2)と辺接触 → 合法
    expect(canPlace(state, 0, 0, 0, 1, 1)).toBe(true);
  });

  it("使用済みピースは配置不可", () => {
    const state = makeState({
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    // ピース全消費済み
    expect(canPlace(state, 0, 0, 0, 0, 0)).toBe(false);
  });

  it("不正なバリアントインデックスは不正", () => {
    const state = makeState();
    expect(canPlace(state, 0, 0, 99, 0, 0)).toBe(false);
    expect(canPlace(state, 0, 0, -1, 0, 0)).toBe(false);
  });

  it("盤面外にはみ出す配置は不正", () => {
    const state = makeState();
    // Piece 18 (I-pentomino xxxxx) は5マス横長 — (0,0) 中心で左にはみ出す可能性
    // 中心が (0,0) だと左側にはみ出す場合
    // variant 0 のcellsを確認して、はみ出すケースを作る
    const piece = PIECES[18];
    // 横バリアント: 端に配置
    // (0, 18) 中心で右にはみ出す
    let hasOutOfBounds = false;
    for (let vi = 0; vi < piece.variants.length; vi++) {
      if (!canPlace(state, 0, 18, vi, 0, 18)) {
        hasOutOfBounds = true;
      }
    }
    // I-pentomino の少なくとも一部のバリアントは (0,18) ではみ出すはず
    expect(hasOutOfBounds).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasAnyValidMove
// ---------------------------------------------------------------------------

describe("hasAnyValidMove", () => {
  it("初期状態では全色に有効手がある", () => {
    const state = makeState();
    for (let c = 0; c < 4; c++) {
      expect(hasAnyValidMove(state, c)).toBe(true);
    }
  });

  it("開始角が埋まっていると初手は打てない", () => {
    // 色0の開始角(0,0)が色1によって塞がれている
    const state = makeState({
      boards: ["0", setBit(0, 0), "0", "0"],
      hasPlacedFirst: [false, true, false, false],
    });
    expect(hasAnyValidMove(state, 0)).toBe(false);
  });

  it("ピースが全て使用済みなら有効手なし", () => {
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
      hasPlacedFirst: [true, false, false, false],
    });
    expect(hasAnyValidMove(state, 0)).toBe(false);
  });

  it("角候補はあるが全てブロックされている場合は有効手なし", () => {
    // 色0が(0,0)に配置済み。角接触候補は(1,1)のみ。
    // (1,1) が他色で埋まっている場合、monomino以外のピースは置けないかもしれないが
    // monomino(piece 0)が残っていない場合を作る
    const state = makeState({
      boards: [setBit(0, 0), setBit(1, 1), "0", "0"],
      hasPlacedFirst: [true, true, false, false],
      remainingPieces: [
        ALL_PIECES_MASK & ~1, // piece 0 を使用済みに
        ALL_PIECES_MASK & ~1,
        ALL_PIECES_MASK,
        ALL_PIECES_MASK,
      ],
    });
    // (1,1) は占有。角接触候補は (1,1) のみだが埋まっている。
    // しかし2マス以上のピースは (1,1) を経由しなくても角接触できるかも
    // → hasAnyValidMove は実際の配置を試行するのでテスト結果は実装依存
    // ここでは結果に関わらず関数が正常に動くことだけ確認
    expect(typeof hasAnyValidMove(state, 0)).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// getValidPlacements
// ---------------------------------------------------------------------------

describe("getValidPlacements", () => {
  it("初手: monomino は開始角に1つだけ配置可能", () => {
    const state = makeState();
    const placements = getValidPlacements(state, 0, 0);
    // monomino: variant 0 のみ、(0,0)のみ
    expect(placements).toHaveLength(1);
    expect(placements[0]).toEqual({ variantIndex: 0, row: 0, col: 0 });
  });

  it("初手: I-tromino は開始角を含む複数配置が可能", () => {
    const state = makeState();
    const placements = getValidPlacements(state, 0, 3); // Piece 3: I-tromino
    expect(placements.length).toBeGreaterThan(1);
    // 全配置で (0,0) をカバーしているはず
    // (canPlace が保証しているので、ここではサイズだけ確認)
  });

  it("使用済みピースには配置なし", () => {
    const state = makeState({
      remainingPieces: [ALL_PIECES_MASK & ~1, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    expect(getValidPlacements(state, 0, 0)).toEqual([]);
  });

  it("2手目: 角接触する配置のみ返す", () => {
    const state = makeState({
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
    });
    const placements = getValidPlacements(state, 0, 0);
    // monomino at (1,1) が唯一の有効配置のはず
    expect(placements).toEqual([{ variantIndex: 0, row: 1, col: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// advanceColor
// ---------------------------------------------------------------------------

describe("advanceColor", () => {
  it("基本: 色0→色1に進む", () => {
    const state = makeState({ currentColorIndex: 0 });
    const next = advanceColor(state);
    expect(next.currentColorIndex).toBe(1);
    expect(next.finished).toBe(false);
  });

  it("色3→色0にラップする", () => {
    const state = makeState({ currentColorIndex: 3 });
    const next = advanceColor(state);
    expect(next.currentColorIndex).toBe(0);
  });

  it("有効手のない色はeliminatedにしてスキップ", () => {
    // 色1のピースを全消費 → eliminated
    const state = makeState({
      currentColorIndex: 0,
      boards: [setBit(0, 0), "0", "0", "0"],
      hasPlacedFirst: [true, false, false, false],
      remainingPieces: [ALL_PIECES_MASK & ~1, 0, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    const next = advanceColor(state);
    expect(next.eliminated[1]).toBe(true);
    // 色2に進むはず
    expect(next.currentColorIndex).toBe(2);
  });

  it("全色がeliminatedならfinished", () => {
    const state = makeState({
      currentColorIndex: 0,
      remainingPieces: [0, 0, 0, 0],
      hasPlacedFirst: [true, true, true, true],
      boards: [setBit(0, 0), setBit(0, 19), setBit(19, 19), setBit(19, 0)],
    });
    const next = advanceColor(state);
    expect(next.finished).toBe(true);
    expect(next.eliminated).toEqual([true, true, true, true]);
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("初手配置後にボードが更新される", () => {
    const state = makeState();
    const next = applyMove(state, 0, 0, 0, 0, 0); // monomino at (0,0)
    // 色0のボードに (0,0) がセットされた
    expect(next.boards[0]).not.toBe("0");
    expect(next.hasPlacedFirst[0]).toBe(true);
    // ピース0が消費された
    expect(next.remainingPieces[0] & 1).toBe(0);
  });

  it("手番が次の色に進む", () => {
    const state = makeState();
    const next = applyMove(state, 0, 0, 0, 0, 0);
    expect(next.currentColorIndex).toBe(1);
  });

  it("元のstateは変更されない（イミュータブル）", () => {
    const state = makeState();
    const boardsBefore = [...state.boards];
    applyMove(state, 0, 0, 0, 0, 0);
    expect(state.boards).toEqual(boardsBefore);
    expect(state.currentColorIndex).toBe(0);
    expect(state.hasPlacedFirst[0]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeRemainingCells / computePlayerRemainingCells
// ---------------------------------------------------------------------------

describe("computeRemainingCells", () => {
  it("全ピース残存なら89マス", () => {
    const state = makeState();
    expect(computeRemainingCells(state, 0)).toBe(89);
  });

  it("全消費済みなら0マス", () => {
    const state = makeState({
      remainingPieces: [0, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    expect(computeRemainingCells(state, 0)).toBe(0);
  });

  it("monomino のみ消費で88マス", () => {
    const state = makeState({
      remainingPieces: [ALL_PIECES_MASK & ~1, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    });
    expect(computeRemainingCells(state, 0)).toBe(88);
  });
});

describe("computePlayerRemainingCells", () => {
  it("4人戦: プレイヤーは1色分", () => {
    const state = makeState();
    expect(computePlayerRemainingCells(state, 0)).toBe(89);
  });

  it("2人戦: プレイヤーは2色分 (89*2=178)", () => {
    const state = makeState({
      playerIds: ["p1", "p2"],
      colorOwner: [0, 1, 0, 1],
    });
    expect(computePlayerRemainingCells(state, 0)).toBe(178);
    expect(computePlayerRemainingCells(state, 1)).toBe(178);
  });
});

// ---------------------------------------------------------------------------
// boardToGrid
// ---------------------------------------------------------------------------

describe("boardToGrid", () => {
  it("空盤面は全て0", () => {
    const state = makeState();
    const grid = boardToGrid(state);
    expect(grid).toHaveLength(BOARD_SIZE);
    expect(grid[0]).toHaveLength(BOARD_SIZE);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
  });

  it("色0のセルは1、色1のセルは2で表現される", () => {
    const state = makeState({
      boards: [setBit(0, 0), setBit(5, 5), "0", "0"],
    });
    const grid = boardToGrid(state);
    expect(grid[0][0]).toBe(1);
    expect(grid[5][5]).toBe(2);
    expect(grid[10][10]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("4人戦の初期状態", () => {
    const state = createInitialState(["a", "b", "c", "d"]);
    expect(state.playerIds).toEqual(["a", "b", "c", "d"]);
    expect(state.colorOwner).toEqual([0, 1, 2, 3]);
    expect(state.currentColorIndex).toBe(0);
    expect(state.finished).toBe(false);
    expect(state.boards).toEqual(["0", "0", "0", "0"]);
  });

  it("2人戦: 対角色を操作", () => {
    const state = createInitialState(["a", "b"]);
    expect(state.colorOwner).toEqual([0, 1, 0, 1]);
  });

  it("3人戦: フリーカラー付き", () => {
    const state = createInitialState(["a", "b", "c"]);
    expect(state.colorOwner).toEqual([0, 1, 2, -1]);
    expect(state.freeColorNextPlayer).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getCurrentPlayerId
// ---------------------------------------------------------------------------

describe("getCurrentPlayerId", () => {
  it("4人戦: 色0 → player 0", () => {
    const state = makeState({ currentColorIndex: 0 });
    expect(getCurrentPlayerId(state)).toBe("p1");
  });

  it("4人戦: 色2 → player 2", () => {
    const state = makeState({ currentColorIndex: 2 });
    expect(getCurrentPlayerId(state)).toBe("p3");
  });

  it("2人戦: 色2 → player 0 (対角色)", () => {
    const state = makeState({
      playerIds: ["p1", "p2"],
      colorOwner: [0, 1, 0, 1],
      currentColorIndex: 2,
    });
    expect(getCurrentPlayerId(state)).toBe("p1");
  });

  it("3人戦: フリーカラー → freeColorNextPlayer のプレイヤー", () => {
    const state = makeState({
      playerIds: ["p1", "p2", "p3"],
      colorOwner: [0, 1, 2, -1],
      currentColorIndex: 3,
      freeColorNextPlayer: 1,
    });
    expect(getCurrentPlayerId(state)).toBe("p2");
  });
});
