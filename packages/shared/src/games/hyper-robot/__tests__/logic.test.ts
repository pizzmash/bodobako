import { describe, expect, it } from "vitest";
import { PIECES, rotatePiece } from "../board.js";
import { isTargetAchieved, simulateRobotMove, sortBids } from "../logic.js";
import type { Bid, Position, RobotColor, TargetMark } from "../types.js";

function makeRobots(positions: Partial<Record<RobotColor, Position>>): Record<RobotColor, Position> {
  return {
    red: { row: 0, col: 0 },
    yellow: { row: 1, col: 0 },
    green: { row: 2, col: 0 },
    blue: { row: 3, col: 0 },
    silver: { row: 4, col: 0 },
    ...positions,
  };
}

function makeWalls(): { rightWalls: boolean[][]; bottomWalls: boolean[][] } {
  return {
    rightWalls: Array.from({ length: 16 }, () => Array(16).fill(false)),
    bottomWalls: Array.from({ length: 16 }, () => Array(16).fill(false)),
  };
}

describe("simulateRobotMove", () => {
  it("ボード端で止まる（上）", () => {
    const robots = makeRobots({ red: { row: 3, col: 5 } });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "up");
    expect(result).toEqual({ row: 0, col: 5 });
  });

  it("ボード端で止まる（下）", () => {
    const robots = makeRobots({ red: { row: 3, col: 5 } });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "down");
    // センター(7-8, 7-8)を避けるため col=5 は関係なく 15 まで
    expect(result).toEqual({ row: 15, col: 5 });
  });

  it("ボード端で止まる（左）", () => {
    const robots = makeRobots({ red: { row: 5, col: 10 } });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "left");
    expect(result).toEqual({ row: 5, col: 0 });
  });

  it("ボード端で止まる（右）", () => {
    const robots = makeRobots({ red: { row: 5, col: 3 } });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "right");
    expect(result).toEqual({ row: 5, col: 15 });
  });

  it("rightWalls で止まる", () => {
    const robots = makeRobots({ red: { row: 5, col: 3 } });
    const { rightWalls, bottomWalls } = makeWalls();
    rightWalls[5]![5] = true; // col=5 に右壁 → col=5 で止まる
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "right");
    expect(result).toEqual({ row: 5, col: 5 });
  });

  it("bottomWalls で止まる", () => {
    const robots = makeRobots({ red: { row: 3, col: 5 } });
    const { rightWalls, bottomWalls } = makeWalls();
    bottomWalls[5]![5] = true; // row=5 に下壁 → row=5 で止まる
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "down");
    expect(result).toEqual({ row: 5, col: 5 });
  });

  it("他ロボットで止まる（右）", () => {
    const robots = makeRobots({
      red: { row: 5, col: 3 },
      blue: { row: 5, col: 7 }, // 右方向の障害
    });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "right");
    expect(result).toEqual({ row: 5, col: 6 });
  });

  it("センター2×2で止まる（右→センター手前）", () => {
    const robots = makeRobots({ red: { row: 7, col: 3 } });
    const { rightWalls, bottomWalls } = makeWalls();
    // センター col=7-8, row=7-8 → col=6 で止まるはず（col=7 がセンター）
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "right");
    expect(result).toEqual({ row: 7, col: 6 });
  });

  it("センター内のロボットでも止まれる（上→センター上壁）", () => {
    // row=0 から下方向に進む: センター(row=7)の前で止まる
    const robots = makeRobots({ red: { row: 3, col: 8 } });
    const { rightWalls, bottomWalls } = makeWalls();
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "down");
    expect(result).toEqual({ row: 6, col: 8 });
  });

  it("自マスに壁がある場合は移動しない", () => {
    const robots = makeRobots({ red: { row: 5, col: 5 } });
    const { rightWalls, bottomWalls } = makeWalls();
    rightWalls[5]![5] = true; // 自マスの右壁
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "right");
    expect(result).toEqual({ row: 5, col: 5 });
  });

  it("上壁（bottomWalls[row-1][col]）で止まる", () => {
    const robots = makeRobots({ red: { row: 5, col: 5 } });
    const { rightWalls, bottomWalls } = makeWalls();
    bottomWalls[3]![5] = true; // row=3 に下壁 = row=4 の上壁
    const result = simulateRobotMove(robots, rightWalls, bottomWalls, "red", "up");
    expect(result).toEqual({ row: 4, col: 5 });
  });
});

describe("isTargetAchieved", () => {
  const target: TargetMark = { id: 1, position: { row: 5, col: 5 }, color: "red" };

  it("colored 成功: 対象ロボットが目標位置にいる && targetRobotLeftTarget=true", () => {
    const robots = makeRobots({ red: { row: 5, col: 5 } });
    expect(isTargetAchieved(robots, target, true)).toBe(true);
  });

  it("colored 失敗: targetRobotLeftTarget=false", () => {
    const robots = makeRobots({ red: { row: 5, col: 5 } });
    expect(isTargetAchieved(robots, target, false)).toBe(false);
  });

  it("colored 失敗: ロボットが目標位置にいない", () => {
    const robots = makeRobots({ red: { row: 3, col: 3 } });
    expect(isTargetAchieved(robots, target, true)).toBe(false);
  });

  it("rainbow 成功: いずれかのロボットが目標位置にいる && targetRobotLeftTarget=true", () => {
    const rainbowTarget: TargetMark = { id: 2, position: { row: 5, col: 5 }, color: "rainbow" };
    const robots = makeRobots({ green: { row: 5, col: 5 } });
    expect(isTargetAchieved(robots, rainbowTarget, true)).toBe(true);
  });

  it("rainbow 失敗: targetRobotLeftTarget=false", () => {
    const rainbowTarget: TargetMark = { id: 2, position: { row: 5, col: 5 }, color: "rainbow" };
    const robots = makeRobots({ green: { row: 5, col: 5 } });
    expect(isTargetAchieved(robots, rainbowTarget, false)).toBe(false);
  });

  it("rainbow 失敗: どのロボットも目標位置にいない", () => {
    const rainbowTarget: TargetMark = { id: 2, position: { row: 5, col: 5 }, color: "rainbow" };
    const robots = makeRobots({});
    expect(isTargetAchieved(robots, rainbowTarget, true)).toBe(false);
  });
});

describe("sortBids", () => {
  const chips: Record<string, number> = { a: 3, b: 1, c: 2, d: 0 };

  it("count 昇順でソート", () => {
    const bids: Bid[] = [
      { playerId: "a", count: 5, orderId: 0 },
      { playerId: "b", count: 3, orderId: 1 },
      { playerId: "c", count: 4, orderId: 2 },
    ];
    const sorted = sortBids(bids, chips);
    expect(sorted.map((b) => b.count)).toEqual([3, 4, 5]);
  });

  it("count 同一の場合 chips 少ない順", () => {
    const bids: Bid[] = [
      { playerId: "a", count: 3, orderId: 0 }, // chips=3
      { playerId: "b", count: 3, orderId: 1 }, // chips=1
    ];
    const sorted = sortBids(bids, chips);
    expect(sorted[0]!.playerId).toBe("b"); // chips少ない方が先
  });

  it("count も chips も同一の場合 orderId 昇順", () => {
    const bids: Bid[] = [
      { playerId: "c", count: 3, orderId: 5 }, // chips=2
      { playerId: "d", count: 3, orderId: 2 }, // chips=0
    ];
    // chips が異なるので d(chips=0) が先
    const sorted = sortBids(bids, chips);
    expect(sorted[0]!.playerId).toBe("d");
  });

  it("count, chips 同一の場合 orderId タイブレーク", () => {
    const sameChips: Record<string, number> = { x: 2, y: 2 };
    const bids: Bid[] = [
      { playerId: "x", count: 3, orderId: 10 },
      { playerId: "y", count: 3, orderId: 5 },
    ];
    const sorted = sortBids(bids, sameChips);
    expect(sorted[0]!.playerId).toBe("y"); // orderId 小さい方が先
  });
});

describe("rotatePiece", () => {
  it("90°×4 で元に戻る", () => {
    const piece = PIECES[0]!;
    const rotated = rotatePiece(piece, 4);
    expect(rotated.centerCol).toBe(piece.centerCol);
    expect(rotated.centerRow).toBe(piece.centerRow);
    expect(rotated.centerWalls).toEqual(piece.centerWalls);
    expect(rotated.marks.length).toBe(piece.marks.length);
    for (let i = 0; i < piece.marks.length; i++) {
      expect(rotated.marks[i]!.col).toBe(piece.marks[i]!.col);
      expect(rotated.marks[i]!.row).toBe(piece.marks[i]!.row);
    }
  });

  it("1回転でセンター座標が変わる", () => {
    const piece = PIECES[0]!; // centerCol=7, centerRow=7
    const rotated = rotatePiece(piece, 1);
    // (col, row) → (7-row, col) = (7-7, 7) = (0, 7)
    expect(rotated.centerCol).toBe(0);
    expect(rotated.centerRow).toBe(7);
  });

  it("2回転でセンターが反対側", () => {
    const piece = PIECES[0]!; // centerCol=7, centerRow=7
    const rotated = rotatePiece(piece, 2);
    // (0,7) → (7-7, 0) = (0, 0)
    expect(rotated.centerCol).toBe(0);
    expect(rotated.centerRow).toBe(0);
  });

  it("壁方向の変換: right→bottom→left→top→right", () => {
    const piece = PIECES[0]!;
    const r1 = rotatePiece(piece, 1);
    // centerWalls: ["left", "top"] → ["top", "right"]
    expect(r1.centerWalls).toContain("top");
    expect(r1.centerWalls).toContain("right");
  });
});
