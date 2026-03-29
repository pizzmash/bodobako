import type { Bid, Position, RobotColor, TargetMark } from "./types.js";
import type { Direction } from "./types.js";

export function simulateRobotMove(
  robots: Record<RobotColor, Position>,
  rightWalls: boolean[][],
  bottomWalls: boolean[][],
  color: RobotColor,
  direction: Direction,
): Position {
  const start = robots[color];
  let row = start.row;
  let col = start.col;

  const robotPositions = new Set<string>(
    (Object.entries(robots) as [RobotColor, Position][])
      .filter(([c]) => c !== color)
      .map(([, p]) => `${p.row},${p.col}`),
  );

  function isCenter(r: number, c: number): boolean {
    return r >= 7 && r <= 8 && c >= 7 && c <= 8;
  }

  while (true) {
    let nextRow = row;
    let nextCol = col;

    if (direction === "up") {
      nextRow = row - 1;
    } else if (direction === "down") {
      nextRow = row + 1;
    } else if (direction === "left") {
      nextCol = col - 1;
    } else {
      nextCol = col + 1;
    }

    // ボード端チェック
    if (nextRow < 0 || nextRow > 15 || nextCol < 0 || nextCol > 15) break;

    // 壁チェック（移動前のマスから出るかチェック）
    if (direction === "up") {
      // 上に出るには現在マスの top 壁 = bottomWalls[row-1][col]
      if (row > 0 && bottomWalls[row - 1]![col]) break;
    } else if (direction === "down") {
      // 下に出るには現在マスの bottom 壁 = bottomWalls[row][col]
      if (bottomWalls[row]![col]) break;
    } else if (direction === "left") {
      // 左に出るには現在マスの left 壁 = rightWalls[row][col-1]
      if (col > 0 && rightWalls[row]![col - 1]) break;
    } else {
      // 右に出るには現在マスの right 壁 = rightWalls[row][col]
      if (rightWalls[row]![col]) break;
    }

    // 次のマスに別ロボットがいる
    if (robotPositions.has(`${nextRow},${nextCol}`)) break;

    // 次のマスがセンター2×2
    if (isCenter(nextRow, nextCol)) break;

    row = nextRow;
    col = nextCol;
  }

  return { row, col };
}

export function isTargetAchieved(
  robots: Record<RobotColor, Position>,
  target: TargetMark,
  targetRobotLeftTarget: boolean,
): boolean {
  if (!targetRobotLeftTarget) return false;

  if (target.color === "rainbow") {
    const colors: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];
    return colors.some(
      (c) => robots[c].row === target.position.row && robots[c].col === target.position.col,
    );
  } else {
    const pos = robots[target.color];
    return pos.row === target.position.row && pos.col === target.position.col;
  }
}

export function sortBids(bids: Bid[], chips: Record<string, number>): Bid[] {
  return [...bids].sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;
    const aChips = chips[a.playerId] ?? 0;
    const bChips = chips[b.playerId] ?? 0;
    if (aChips !== bChips) return aChips - bChips;
    return a.orderId - b.orderId;
  });
}

export function getWinChips(playerCount: number): number {
  if (playerCount <= 2) return 8;
  if (playerCount === 3) return 6;
  if (playerCount === 4) return 5;
  return 3;
}

const ROBOT_COLORS: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];

export function placeRobotsRandomly(
  targets: TargetMark[],
  rightWalls: boolean[][],
  bottomWalls: boolean[][],
): Record<RobotColor, Position> {
  const forbidden = new Set<string>(targets.map((t) => `${t.position.row},${t.position.col}`));
  const placed = new Set<string>();
  const result: Partial<Record<RobotColor, Position>> = {};

  for (const color of ROBOT_COLORS) {
    let pos: Position;
    let key: string;
    do {
      const row = Math.floor(Math.random() * 16);
      const col = Math.floor(Math.random() * 16);
      pos = { row, col };
      key = `${row},${col}`;
    } while (
      // センター禁止
      (pos.row >= 7 && pos.row <= 8 && pos.col >= 7 && pos.col <= 8) ||
      // 目標マス禁止
      forbidden.has(key) ||
      // 重複禁止
      placed.has(key)
    );
    placed.add(key);
    result[color] = pos;
  }

  // rightWalls and bottomWalls are not used for placement (only position constraints matter)
  void rightWalls;
  void bottomWalls;

  return result as Record<RobotColor, Position>;
}
