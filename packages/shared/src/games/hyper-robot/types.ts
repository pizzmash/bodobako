export type RobotColor = "red" | "yellow" | "green" | "blue" | "silver";
export type Direction = "up" | "down" | "left" | "right";
export type TargetColor = RobotColor | "rainbow";
export type HyperRobotPhase = "configuring" | "bidding" | "solving" | "revealing" | "finished";

export interface Position {
  row: number;
  col: number;
}

export interface TargetMark {
  id: number;
  position: Position;
  color: TargetColor;
}

export interface Bid {
  playerId: string;
  count: number;
  orderId: number; // 単調増加。タイブレーク用
}

export interface HyperRobotState {
  phase: HyperRobotPhase;
  rightWalls: boolean[][]; // [row][col]
  bottomWalls: boolean[][]; // [row][col]
  allTargets: TargetMark[];
  robots: Record<RobotColor, Position>;
  remainingTargets: TargetMark[];
  currentTarget: TargetMark | null;
  chips: Record<string, number>;
  winChips: number;
  hostPlayerId: string;
  playerIds: string[];
  bids: Bid[];
  biddingOpen: boolean;
  nextOrderId: number;
  timerVersion: number;
  currentBidIndex: number;
  moveCount: number;
  robotsSnapshot: Record<RobotColor, Position>;
  targetRobotLeftTarget: boolean;
  isRetry: boolean;
  confirmedBidders: string[];
  wonTargets: Record<string, number[]>;
  revealingTarget: TargetMark | null; // revealing フェーズで開示するターゲット
  revealingPlayer: string | null;     // revealing フェーズで獲得したプレイヤーID
  lastFailureRobots: Record<RobotColor, Position> | null; // 失敗時の最終ロボット位置（ポップアップ表示用）
}

export type HyperRobotMove =
  | { type: "start-game"; winChips: number }
  | { type: "bid"; count: number }
  | { type: "end-bidding" }
  | { type: "skip-target" }
  | { type: "move-robot"; color: RobotColor; direction: Direction }
  | { type: "give-up" }
  | { type: "confirm-bid" }
  | { type: "unconfirm-bid" }
  | { type: "next-target" };
