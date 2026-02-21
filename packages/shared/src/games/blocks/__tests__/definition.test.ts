import { describe, expect, it } from "vitest";
import { toHex } from "../bitboard.js";
import { blocksDefinition } from "../definition.js";
import { PIECES } from "../pieces.js";
import type { BlocksMove, BlocksState } from "../types.js";
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

function setBit(row: number, col: number): string {
  return toHex(1n << BigInt(row * BOARD_SIZE + col));
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("4人用の初期状態を正しく生成する", () => {
    const state = blocksDefinition.createInitialState(["a", "b", "c", "d"]);
    expect(state.playerIds).toEqual(["a", "b", "c", "d"]);
    expect(state.colorOwner).toEqual([0, 1, 2, 3]);
    expect(state.boards).toEqual(["0", "0", "0", "0"]);
    expect(state.finished).toBe(false);
    expect(state.currentColorIndex).toBe(0);
  });

  it("2人用では対角色マッピング", () => {
    const state = blocksDefinition.createInitialState(["a", "b"]);
    expect(state.colorOwner).toEqual([0, 1, 0, 1]);
  });

  it("3人用ではフリーカラー付き", () => {
    const state = blocksDefinition.createInitialState(["a", "b", "c"]);
    expect(state.colorOwner).toEqual([0, 1, 2, -1]);
  });
});

// ---------------------------------------------------------------------------
// parseMove
// ---------------------------------------------------------------------------

describe("parseMove", () => {
  it("正常なムーブをパースする", () => {
    const move = blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 0, col: 0 });
    expect(move).toEqual({ pieceId: 0, variantIndex: 0, row: 0, col: 0 });
  });

  it("null/undefined → null", () => {
    expect(blocksDefinition.parseMove!(null)).toBeNull();
    expect(blocksDefinition.parseMove!(undefined)).toBeNull();
  });

  it("プリミティブ値 → null", () => {
    expect(blocksDefinition.parseMove!(42)).toBeNull();
    expect(blocksDefinition.parseMove!("string")).toBeNull();
    expect(blocksDefinition.parseMove!(true)).toBeNull();
  });

  it("必須フィールド欠落 → null", () => {
    expect(blocksDefinition.parseMove!({ pieceId: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 0 })).toBeNull();
  });

  it("非整数値 → null", () => {
    expect(blocksDefinition.parseMove!({ pieceId: 0.5, variantIndex: 0, row: 0, col: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 1.1, col: 0 })).toBeNull();
  });

  it("pieceId 範囲外 → null", () => {
    expect(blocksDefinition.parseMove!({ pieceId: -1, variantIndex: 0, row: 0, col: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 21, variantIndex: 0, row: 0, col: 0 })).toBeNull();
  });

  it("variantIndex 範囲外 → null", () => {
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 5, row: 0, col: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: -1, row: 0, col: 0 })).toBeNull();
  });

  it("row/col 範囲外 → null", () => {
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: -1, col: 0 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 0, col: 20 })).toBeNull();
    expect(blocksDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 20, col: 0 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateMove
// ---------------------------------------------------------------------------

describe("validateMove", () => {
  it("手番プレイヤーの合法手は true", () => {
    const state = makeState();
    const move: BlocksMove = { pieceId: 0, variantIndex: 0, row: 0, col: 0 };
    expect(blocksDefinition.validateMove(state, move, "p1")).toBe(true);
  });

  it("手番でないプレイヤーは false", () => {
    const state = makeState();
    const move: BlocksMove = { pieceId: 0, variantIndex: 0, row: 0, col: 0 };
    expect(blocksDefinition.validateMove(state, move, "p2")).toBe(false);
  });

  it("終了済みゲームは false", () => {
    const state = makeState({ finished: true });
    const move: BlocksMove = { pieceId: 0, variantIndex: 0, row: 0, col: 0 };
    expect(blocksDefinition.validateMove(state, move, "p1")).toBe(false);
  });

  it("不正な配置は false", () => {
    const state = makeState();
    // (5,5) は開始角でない
    const move: BlocksMove = { pieceId: 0, variantIndex: 0, row: 5, col: 5 };
    expect(blocksDefinition.validateMove(state, move, "p1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("初手配置でボード更新・ピース消費・手番交代", () => {
    const state = makeState();
    const move: BlocksMove = { pieceId: 0, variantIndex: 0, row: 0, col: 0 };
    const next = blocksDefinition.applyMove(state, move, "p1");

    expect(next.boards[0]).not.toBe("0"); // ボード更新
    expect(next.remainingPieces[0] & 1).toBe(0); // ピース0消費
    expect(next.hasPlacedFirst[0]).toBe(true);
    expect(next.currentColorIndex).toBe(1); // 手番交代
  });

  it("連続手後もイミュータブルに動作する", () => {
    let state = makeState();

    // 色0: monomino at (0,0)
    state = blocksDefinition.applyMove(
      state,
      { pieceId: 0, variantIndex: 0, row: 0, col: 0 },
      "p1",
    );
    expect(state.currentColorIndex).toBe(1);

    // 色1: monomino at (0,19)
    state = blocksDefinition.applyMove(
      state,
      { pieceId: 0, variantIndex: 0, row: 0, col: 19 },
      "p2",
    );
    expect(state.currentColorIndex).toBe(2);

    // 色2: monomino at (19,19)
    state = blocksDefinition.applyMove(
      state,
      { pieceId: 0, variantIndex: 0, row: 19, col: 19 },
      "p3",
    );
    expect(state.currentColorIndex).toBe(3);

    // 色3: monomino at (19,0)
    state = blocksDefinition.applyMove(
      state,
      { pieceId: 0, variantIndex: 0, row: 19, col: 0 },
      "p4",
    );
    // 色0に戻る
    expect(state.currentColorIndex).toBe(0);
    expect(state.finished).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------

describe("getStatus", () => {
  it("未終了状態は 'playing'", () => {
    const state = makeState();
    expect(blocksDefinition.getStatus(state)).toBe("playing");
  });

  it("終了状態は 'finished'", () => {
    const state = makeState({ finished: true });
    expect(blocksDefinition.getStatus(state)).toBe("finished");
  });
});

// ---------------------------------------------------------------------------
// getRanking
// ---------------------------------------------------------------------------

describe("getRanking", () => {
  it("未終了なら null", () => {
    const state = makeState();
    expect(blocksDefinition.getRanking(state)).toBeNull();
  });

  it("残りが少ないプレイヤーが上位", () => {
    const state = makeState({
      finished: true,
      // p1: monomino(1マス)消費→残88, p2: pentomino(5マス)消費→残84, 他は89
      remainingPieces: [
        ALL_PIECES_MASK & ~(1 << 0),  // piece 0 (1マス) 消費
        ALL_PIECES_MASK & ~(1 << 17), // piece 17 (5マス) 消費
        ALL_PIECES_MASK,
        ALL_PIECES_MASK,
      ],
    });
    const ranking = blocksDefinition.getRanking(state);
    expect(ranking).not.toBeNull();
    // p2 が残り84で最少→1位、p1が88で2位、p3/p4が89で3位タイ
    expect(ranking![0]).toBe("p2");
    expect(ranking![1]).toBe("p1");
  });

  it("全員同点なら引き分け (null)", () => {
    const state = makeState({ finished: true });
    expect(blocksDefinition.getRanking(state)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCurrentPlayerId
// ---------------------------------------------------------------------------

describe("getCurrentPlayerId", () => {
  it("色0手番 → p1", () => {
    const state = makeState();
    expect(blocksDefinition.getCurrentPlayerId(state)).toBe("p1");
  });

  it("色3手番 → p4", () => {
    const state = makeState({ currentColorIndex: 3 });
    expect(blocksDefinition.getCurrentPlayerId(state)).toBe("p4");
  });

  it("2人戦: 色2手番 → p1", () => {
    const state = makeState({
      playerIds: ["p1", "p2"],
      colorOwner: [0, 1, 0, 1],
      currentColorIndex: 2,
    });
    expect(blocksDefinition.getCurrentPlayerId(state)).toBe("p1");
  });

  it("3人戦: フリーカラー手番はローテーション先のプレイヤー", () => {
    const state = makeState({
      playerIds: ["p1", "p2", "p3"],
      colorOwner: [0, 1, 2, -1],
      currentColorIndex: 3,
      freeColorNextPlayer: 2,
    });
    expect(blocksDefinition.getCurrentPlayerId(state)).toBe("p3");
  });
});

// ---------------------------------------------------------------------------
// ゲームフロー統合テスト
// ---------------------------------------------------------------------------

describe("ゲームフロー統合", () => {
  it("4人が1手ずつ打って正常にゲームが進行する", () => {
    let state = blocksDefinition.createInitialState(["p1", "p2", "p3", "p4"]);

    // 各プレイヤーが自分の角に monomino を配置
    const corners: [number, number][] = [[0, 0], [0, 19], [19, 19], [19, 0]];
    const players = ["p1", "p2", "p3", "p4"];

    for (let i = 0; i < 4; i++) {
      expect(blocksDefinition.getStatus(state)).toBe("playing");
      expect(blocksDefinition.getCurrentPlayerId(state)).toBe(players[i]);

      const move: BlocksMove = {
        pieceId: 0,
        variantIndex: 0,
        row: corners[i][0],
        col: corners[i][1],
      };
      expect(blocksDefinition.validateMove(state, move, players[i])).toBe(true);
      state = blocksDefinition.applyMove(state, move, players[i]);
    }

    // 1周して色0に戻る
    expect(blocksDefinition.getCurrentPlayerId(state)).toBe("p1");
    expect(blocksDefinition.getStatus(state)).toBe("playing");
  });

  it("2人戦で正しい手番順 (色0→色1→色2→色3→色0…)", () => {
    let state = blocksDefinition.createInitialState(["p1", "p2"]);

    // 色0(p1), 色1(p2), 色2(p1), 色3(p2) の順
    const corners: [number, number][] = [[0, 0], [0, 19], [19, 19], [19, 0]];
    const expectedPlayers = ["p1", "p2", "p1", "p2"];

    for (let i = 0; i < 4; i++) {
      expect(blocksDefinition.getCurrentPlayerId(state)).toBe(expectedPlayers[i]);
      const move: BlocksMove = {
        pieceId: 0,
        variantIndex: 0,
        row: corners[i][0],
        col: corners[i][1],
      };
      expect(blocksDefinition.validateMove(state, move, expectedPlayers[i])).toBe(true);
      state = blocksDefinition.applyMove(state, move, expectedPlayers[i]);
    }
  });
});
