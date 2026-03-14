import { describe, expect, it } from "vitest";
import { blokusTrigonDefinition } from "../definition.js";
import { ALL_PIECES_MASK } from "../logic.js";
import { PIECES } from "../pieces.js";
import type { BlokusTrigonMove, BlokusTrigonState } from "../types.js";
import { NUM_PIECES, START_POSITIONS } from "../types.js";

/** 配置先 (row, col) に合う piece #0 のバリアントインデックスを返す */
function vi0(row: number, col: number): number {
  return (row + col) % 2;
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("4人用の初期状態を正しく生成する", () => {
    const state = blokusTrigonDefinition.createInitialState(["a", "b", "c", "d"]);
    expect(state.playerIds).toEqual(["a", "b", "c", "d"]);
    expect(state.colorOwner).toEqual([0, 1, 2, 3]);
    expect(state.numColors).toBe(4);
    expect(state.borderRestriction).toBe(false);
    expect(state.finished).toBe(false);
    expect(state.currentColorIndex).toBe(0);
  });

  it("2人用では対角色マッピング", () => {
    const state = blokusTrigonDefinition.createInitialState(["a", "b"]);
    expect(state.colorOwner).toEqual([0, 1, 0, 1]);
    expect(state.numColors).toBe(4);
  });

  it("3人用では外周制限あり", () => {
    const state = blokusTrigonDefinition.createInitialState(["a", "b", "c"]);
    expect(state.colorOwner).toEqual([0, 1, 2]);
    expect(state.numColors).toBe(3);
    expect(state.borderRestriction).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseMove
// ---------------------------------------------------------------------------

describe("parseMove", () => {
  it("正常なムーブをパースする", () => {
    const move = blokusTrigonDefinition.parseMove!({
      pieceId: 0,
      variantIndex: 0,
      row: 3,
      col: 17,
    });
    expect(move).toEqual({ pieceId: 0, variantIndex: 0, row: 3, col: 17 });
  });

  it("null/undefined → null", () => {
    expect(blokusTrigonDefinition.parseMove!(null)).toBeNull();
    expect(blokusTrigonDefinition.parseMove!(undefined)).toBeNull();
  });

  it("プリミティブ値 → null", () => {
    expect(blokusTrigonDefinition.parseMove!(42)).toBeNull();
    expect(blokusTrigonDefinition.parseMove!("string")).toBeNull();
    expect(blokusTrigonDefinition.parseMove!(true)).toBeNull();
  });

  it("必須フィールド欠落 → null", () => {
    expect(blokusTrigonDefinition.parseMove!({ pieceId: 0 })).toBeNull();
    expect(blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0 })).toBeNull();
    expect(blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 0 })).toBeNull();
  });

  it("非整数値 → null", () => {
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0.5, variantIndex: 0, row: 3, col: 17 }),
    ).toBeNull();
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 1.1, col: 0 }),
    ).toBeNull();
  });

  it("pieceId 範囲外 → null", () => {
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: -1, variantIndex: 0, row: 3, col: 17 }),
    ).toBeNull();
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: NUM_PIECES, variantIndex: 0, row: 3, col: 17 }),
    ).toBeNull();
  });

  it("variantIndex 範囲外 → null", () => {
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 99, row: 3, col: 17 }),
    ).toBeNull();
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: -1, row: 3, col: 17 }),
    ).toBeNull();
  });

  it("row/col 範囲外 → null", () => {
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: -1, col: 17 }),
    ).toBeNull();
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 18, col: 17 }),
    ).toBeNull();
    expect(
      blokusTrigonDefinition.parseMove!({ pieceId: 0, variantIndex: 0, row: 3, col: 35 }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateMove
// ---------------------------------------------------------------------------

describe("validateMove", () => {
  it("手番プレイヤーの合法手は true", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    // 色0のスタート: START_POSITIONS[0] = (6,9), parity=1
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    expect(blokusTrigonDefinition.validateMove(state, move, "p1")).toBe(true);
  });

  it("手番でないプレイヤーは false", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    expect(blokusTrigonDefinition.validateMove(state, move, "p2")).toBe(false);
  });

  it("終了済みゲームは false", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    (state as BlokusTrigonState).finished = true;
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    expect(blokusTrigonDefinition.validateMove(state, move, "p1")).toBe(false);
  });

  it("不正な配置は false（スタートマスから離れた初手）", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(8, 10), row: 8, col: 10 };
    expect(blokusTrigonDefinition.validateMove(state, move, "p1")).toBe(false);
  });

  it("3人戦: 色2 (p3) のスタートは (14,17)", () => {
    let state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3"]);
    // p1(色0), p2(色1) の初手を先に打つ
    const move0: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    state = blokusTrigonDefinition.applyMove(state, move0, "p1");
    const move1: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 25), row: 6, col: 25 };
    state = blokusTrigonDefinition.applyMove(state, move1, "p2");
    // p3(色2)の手番: 3人戦のスタートは (14,17)
    const move2: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(14, 17), row: 14, col: 17 };
    expect(blokusTrigonDefinition.validateMove(state, move2, "p3")).toBe(true);
    // 別の位置は不正
    const wrongMove: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(8, 17), row: 8, col: 17 };
    expect(blokusTrigonDefinition.validateMove(state, wrongMove, "p3")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyMove
// ---------------------------------------------------------------------------

describe("applyMove", () => {
  it("初手配置でボード更新・ピース消費・手番交代", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    const next = blokusTrigonDefinition.applyMove(state, move, "p1");

    expect(next.boards[0]).not.toBe("0");
    expect(next.remainingPieces[0] & 1).toBe(0);
    expect(next.hasPlacedFirst[0]).toBe(true);
    expect(next.currentColorIndex).toBe(1);
  });

  it("連続手後もイミュータブルに動作する", () => {
    let state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);

    // 色0→色1→色2→色3の順にスタートマスにmonominoを配置
    const starts = START_POSITIONS.slice(0, 4);
    const players = ["p1", "p2", "p3", "p4"];

    for (let i = 0; i < 4; i++) {
      expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe(players[i]);
      const move: BlokusTrigonMove = {
        pieceId: 0,
        variantIndex: vi0(starts[i][0], starts[i][1]),
        row: starts[i][0],
        col: starts[i][1],
      };
      state = blokusTrigonDefinition.applyMove(state, move, players[i]);
    }

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
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2"]);
    expect(blokusTrigonDefinition.getStatus(state)).toBe("playing");
  });

  it("終了状態は 'finished'", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2"]);
    (state as BlokusTrigonState).finished = true;
    expect(blokusTrigonDefinition.getStatus(state)).toBe("finished");
  });
});

// ---------------------------------------------------------------------------
// getRanking
// ---------------------------------------------------------------------------

describe("getRanking", () => {
  it("未終了なら null", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    expect(blokusTrigonDefinition.getRanking(state)).toBeNull();
  });

  it("残りが少ないプレイヤーが上位", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const s = state as BlokusTrigonState;
    s.finished = true;
    // p1(色0): 大きいピース消費 → 残少ない
    s.remainingPieces[0] = ALL_PIECES_MASK & ~(1 << 21); // piece 21 (6マス) 消費
    // p2(色1): 小さいピース消費 → 残多い
    s.remainingPieces[1] = ALL_PIECES_MASK & ~(1 << 0); // piece 0 (1マス) 消費
    // p3,p4: 全残り

    const ranking = blokusTrigonDefinition.getRanking(s);
    expect(ranking).not.toBeNull();
    // p1の残りが一番少ない
    expect(ranking![0]).toBe("p1");
    expect(ranking![1]).toBe("p2");
  });

  it("全員同点なら引き分け (null)", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    (state as BlokusTrigonState).finished = true;
    expect(blokusTrigonDefinition.getRanking(state)).toBeNull();
  });

  it("全ピース使い切りボーナスが反映される", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const s = state as BlokusTrigonState;
    s.finished = true;
    // p1(色0): 全ピース使い切り → ボーナス-15 → score=-15
    s.remainingPieces[0] = 0;
    s.lastPieceSize[0] = 3;
    // p2(色1): 1マスだけ残り → score=1
    s.remainingPieces[1] = 1; // piece 0 (1マス) だけ残り
    // p3,p4: 全残り → score=75

    const ranking = blokusTrigonDefinition.getRanking(s);
    expect(ranking).not.toBeNull();
    expect(ranking![0]).toBe("p1"); // -15が最少
  });
});

// ---------------------------------------------------------------------------
// getCurrentPlayerId
// ---------------------------------------------------------------------------

describe("getCurrentPlayerId", () => {
  it("色0手番 → p1", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe("p1");
  });

  it("2人戦: 色2手番 → p1", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2"]);
    (state as BlokusTrigonState).currentColorIndex = 2;
    expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe("p1");
  });
});

// ---------------------------------------------------------------------------
// getLogEntries
// ---------------------------------------------------------------------------

describe("getLogEntries", () => {
  it("配置後にログエントリが生成される", () => {
    const prev = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    const next = blokusTrigonDefinition.applyMove(prev, move, "p1");

    const logs = blokusTrigonDefinition.getLogEntries!(prev, next);
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe("を配置");
    expect(logs[0].metadata?.pieceId).toBe(0);
    expect(logs[0].metadata?.colorIndex).toBe(0);
    expect(logs[0].playerId).toBe("p1");
  });

  it("pieceSizeメタデータが正しい (1マスピース)", () => {
    const prev = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const move: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    const next = blokusTrigonDefinition.applyMove(prev, move, "p1");
    const logs = blokusTrigonDefinition.getLogEntries!(prev, next);
    expect(logs[0].metadata?.pieceSize).toBe(1);
  });

  it("2人戦: p2が色1を配置したときのログにp2が記録される", () => {
    let state = blokusTrigonDefinition.createInitialState(["p1", "p2"]);
    // p1(色0)の初手
    const move0: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 9), row: 6, col: 9 };
    const afterP1 = blokusTrigonDefinition.applyMove(state, move0, "p1");
    // p2(色1)の初手
    const move1: BlokusTrigonMove = { pieceId: 0, variantIndex: vi0(6, 25), row: 6, col: 25 };
    const afterP2 = blokusTrigonDefinition.applyMove(afterP1, move1, "p2");
    const logs = blokusTrigonDefinition.getLogEntries!(afterP1, afterP2);
    expect(logs[0].playerId).toBe("p2");
    expect(logs[0].metadata?.colorIndex).toBe(1);
  });

  it("lastMoveがなければ空配列", () => {
    const state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);
    const logs = blokusTrigonDefinition.getLogEntries!(state, state);
    expect(logs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ゲームフロー統合テスト
// ---------------------------------------------------------------------------

describe("ゲームフロー統合", () => {
  it("4人が1手ずつ打って正常にゲームが進行する", () => {
    let state = blokusTrigonDefinition.createInitialState(["p1", "p2", "p3", "p4"]);

    const starts = START_POSITIONS.slice(0, 4);
    const players = ["p1", "p2", "p3", "p4"];

    for (let i = 0; i < 4; i++) {
      expect(blokusTrigonDefinition.getStatus(state)).toBe("playing");
      expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe(players[i]);

      const move: BlokusTrigonMove = {
        pieceId: 0,
        variantIndex: vi0(starts[i][0], starts[i][1]),
        row: starts[i][0],
        col: starts[i][1],
      };
      expect(blokusTrigonDefinition.validateMove(state, move, players[i])).toBe(true);
      state = blokusTrigonDefinition.applyMove(state, move, players[i]);
    }

    expect(blokusTrigonDefinition.getStatus(state)).toBe("playing");
    expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe("p1");
  });

  it("2人戦: 4色のターンが正しく回る", () => {
    let state = blokusTrigonDefinition.createInitialState(["p1", "p2"]);

    // 色0(p1) → 色1(p2) → 色2(p1) → 色3(p2)
    const starts = START_POSITIONS.slice(0, 4);
    const expectedPlayers = ["p1", "p2", "p1", "p2"];

    for (let i = 0; i < 4; i++) {
      expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe(expectedPlayers[i]);
      const move: BlokusTrigonMove = {
        pieceId: 0,
        variantIndex: vi0(starts[i][0], starts[i][1]),
        row: starts[i][0],
        col: starts[i][1],
      };
      state = blokusTrigonDefinition.applyMove(state, move, expectedPlayers[i]);
    }

    expect(blokusTrigonDefinition.getCurrentPlayerId(state)).toBe("p1");
  });
});
