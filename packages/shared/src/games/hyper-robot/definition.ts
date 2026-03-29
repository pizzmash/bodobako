import type { GameDefinition, GameLogEntry } from "../../types/game.js";
import { generateRandomBoard } from "./board.js";
import {
  getWinChips,
  isTargetAchieved,
  placeRobotsRandomly,
  simulateRobotMove,
  sortBids,
} from "./logic.js";
import type {
  Bid,
  Direction,
  HyperRobotMove,
  HyperRobotState,
  RobotColor,
  TargetMark,
} from "./types.js";

const ROBOT_COLORS: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function copyRobots(robots: Record<RobotColor, { row: number; col: number }>): Record<RobotColor, { row: number; col: number }> {
  return {
    red: { ...robots.red },
    yellow: { ...robots.yellow },
    green: { ...robots.green },
    blue: { ...robots.blue },
    silver: { ...robots.silver },
  };
}

function initTargetRobotLeftTarget(
  currentTarget: TargetMark | null,
  robots: Record<RobotColor, { row: number; col: number }>,
): boolean {
  if (!currentTarget) return true;
  if (currentTarget.color === "rainbow") {
    // いずれかのロボットが target.position にいない → targetRobotLeftTarget = true
    // ただし開始時は「まだ離れていない」(離れたことが確認されていない) → false
    // 実装上の意味: 目標ロボットがまだターゲット上にいる可能性 → targetRobotLeftTarget=false
    const anyOnTarget = ROBOT_COLORS.some(
      (c) =>
        robots[c].row === currentTarget.position.row &&
        robots[c].col === currentTarget.position.col,
    );
    return !anyOnTarget;
  } else {
    const robotPos = robots[currentTarget.color];
    return !(
      robotPos.row === currentTarget.position.row &&
      robotPos.col === currentTarget.position.col
    );
  }
}

function advanceTarget(state: HyperRobotState): HyperRobotState {
  let remaining = [...state.remainingTargets];
  if (remaining.length === 0) {
    remaining = shuffleArray([...state.allTargets]);
  }
  const currentTarget = remaining[0]!;
  const newRemaining = remaining.slice(1);
  const targetRobotLeftTarget = initTargetRobotLeftTarget(currentTarget, state.robots);
  return {
    ...state,
    remainingTargets: newRemaining,
    currentTarget,
    targetRobotLeftTarget,
    phase: "bidding",
    bids: [],
    biddingOpen: true,
    timerVersion: 0,
    isRetry: false,
    confirmedBidders: [],
    revealingTarget: null,
    revealingPlayer: "",
    // lastFailureRobots は呼び出し元で制御（retry失敗時は保持、それ以外は null を渡す）
  };
}

function nextSolver(state: HyperRobotState): HyperRobotState {
  // 失敗時の最終ロボット位置を記録（state.robots は呼び出し元が最終位置を持つ）
  const lastFailureRobots = copyRobots(state.robots);

  const nextIndex = state.currentBidIndex + 1;
  if (nextIndex < state.bids.length) {
    // 次の解決者へ
    return {
      ...state,
      currentBidIndex: nextIndex,
      moveCount: 0,
      robots: copyRobots(state.robotsSnapshot),
      lastFailureRobots,
    };
  }
  // 全員失敗
  if (state.isRetry) {
    // 2回目の全員失敗 → ターゲットをスキップ（robots を snapshot にリセット）
    return advanceTarget({
      ...state,
      robots: copyRobots(state.robotsSnapshot),
      isRetry: false,
      phase: "bidding",
      lastFailureRobots,
    });
  }
  // 1回目の全員失敗 → isRetry:true で即時タイマー開始
  return {
    ...state,
    robots: copyRobots(state.robotsSnapshot),
    bids: [],
    biddingOpen: true,
    phase: "bidding",
    currentBidIndex: 0,
    moveCount: 0,
    isRetry: true,
    timerVersion: state.timerVersion + 1,
    confirmedBidders: [],
    revealingTarget: null,
    revealingPlayer: "",
    lastFailureRobots,
  };
}

export const hyperRobotDefinition: GameDefinition<HyperRobotState, HyperRobotMove> = {
  id: "hyper-robot",
  name: "ハイパーロボット",
  description: "壁にぶつかるまでスライド移動！最少手数でロボットをゴールへ導け！",
  minPlayers: 2,
  maxPlayers: null,

  createInitialState(playerIds: string[]): HyperRobotState {
    const { rightWalls, bottomWalls, targets } = generateRandomBoard();
    const shuffledTargets = shuffleArray(targets);
    const robots = placeRobotsRandomly(shuffledTargets, rightWalls, bottomWalls);
    const winChips = getWinChips(playerIds.length);

    const chips: Record<string, number> = {};
    for (const pid of playerIds) {
      chips[pid] = 0;
    }

    const remainingTargets = shuffledTargets.slice(1);
    const currentTarget = shuffledTargets[0] ?? null;
    const targetRobotLeftTarget = initTargetRobotLeftTarget(currentTarget, robots);

    return {
      phase: "configuring",
      rightWalls,
      bottomWalls,
      allTargets: shuffledTargets,
      robots,
      remainingTargets,
      currentTarget,
      chips,
      winChips,
      playerIds,
      bids: [],
      biddingOpen: false,
      nextOrderId: 0,
      timerVersion: 0,
      currentBidIndex: 0,
      moveCount: 0,
      robotsSnapshot: copyRobots(robots),
      targetRobotLeftTarget,
      isRetry: false,
      confirmedBidders: [],
      wonTargets: {},
      revealingTarget: null,
      revealingPlayer: "",
      lastFailureRobots: null,
    };
  },

  parseMove(raw: unknown): HyperRobotMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;
    if (typeof m.type !== "string") return null;

    switch (m.type) {
      case "start-game": {
        if (typeof m.winChips !== "number" || !Number.isInteger(m.winChips) || m.winChips < 1) return null;
        return { type: "start-game", winChips: m.winChips };
      }
      case "bid": {
        if (typeof m.count !== "number" || !Number.isInteger(m.count) || m.count < 1) return null;
        return { type: "bid", count: m.count };
      }
      case "end-bidding":
        return { type: "end-bidding" };
      case "skip-target":
        return { type: "skip-target" };
      case "move-robot": {
        const validColors: RobotColor[] = ["red", "yellow", "green", "blue", "silver"];
        const validDirections: Direction[] = ["up", "down", "left", "right"];
        if (!validColors.includes(m.color as RobotColor)) return null;
        if (!validDirections.includes(m.direction as Direction)) return null;
        return { type: "move-robot", color: m.color as RobotColor, direction: m.direction as Direction };
      }
      case "give-up":
        return { type: "give-up" };
      case "confirm-bid":
        return { type: "confirm-bid" };
      case "unconfirm-bid":
        return { type: "unconfirm-bid" };
      case "next-target":
        return { type: "next-target" };
      default:
        return null;
    }
  },

  validateMove(state: HyperRobotState, move: HyperRobotMove, playerId: string): boolean {
    if (!state.playerIds.includes(playerId)) return false;

    switch (move.type) {
      case "start-game": {
        if (state.phase !== "configuring") return false;
        // ホスト（playerIds[0]）のみ実行可
        if (playerId !== state.playerIds[0]) return false;
        if (move.winChips < 1 || move.winChips > 17) return false;
        return true;
      }
      case "bid": {
        if (state.phase !== "bidding" || !state.biddingOpen) return false;
        if (move.count < 1) return false;
        const existing = state.bids.find((b) => b.playerId === playerId);
        if (existing) {
          // 既存宣言がある場合は count が低い場合のみ更新可
          return move.count < existing.count;
        }
        return true;
      }
      case "end-bidding": {
        return state.phase === "bidding" && state.biddingOpen && state.playerIds.includes(playerId);
      }
      case "skip-target": {
        return state.phase === "bidding" && !state.biddingOpen && state.bids.length === 0;
      }
      case "confirm-bid": {
        return state.phase === "bidding" && !state.confirmedBidders.includes(playerId);
      }
      case "unconfirm-bid": {
        return state.phase === "bidding" && state.confirmedBidders.includes(playerId);
      }
      case "next-target": {
        return state.phase === "revealing" && state.playerIds.includes(playerId);
      }
      case "move-robot": {
        if (state.phase !== "solving") return false;
        return playerId === (state.bids[state.currentBidIndex]?.playerId ?? "");
      }
      case "give-up": {
        if (state.phase !== "solving") return false;
        return playerId === (state.bids[state.currentBidIndex]?.playerId ?? "");
      }
    }
  },

  applyMove(state: HyperRobotState, move: HyperRobotMove, playerId: string): HyperRobotState {
    switch (move.type) {
      case "start-game": {
        return {
          ...state,
          phase: "bidding",
          winChips: move.winChips,
          biddingOpen: true,
        };
      }
      case "bid": {
        const existingIdx = state.bids.findIndex((b) => b.playerId === playerId);
        let newBids: Bid[];
        const orderId = state.nextOrderId;
        const nextOrderId = state.nextOrderId + 1;

        if (existingIdx >= 0) {
          // 既存宣言を更新
          newBids = state.bids.map((b, i) =>
            i === existingIdx ? { ...b, count: move.count, orderId } : b,
          );
        } else {
          newBids = [...state.bids, { playerId, count: move.count, orderId }];
        }

        const sorted = sortBids(newBids, state.chips);
        const prevMin = state.bids.length > 0 ? sortBids(state.bids, state.chips)[0]!.count : Infinity;
        const newMin = sorted.length > 0 ? sorted[0]!.count : Infinity;
        const timerVersion = newMin < prevMin ? state.timerVersion + 1 : state.timerVersion;

        return {
          ...state,
          bids: sorted,
          nextOrderId,
          timerVersion,
          confirmedBidders: state.confirmedBidders.filter(id => id !== playerId),
        };
      }

      case "end-bidding": {
        if (state.bids.length === 0) {
          // 宣言なし → 自動スキップ
          return advanceTarget({ ...state, lastFailureRobots: null });
        }
        // 解決フェーズへ
        const robotsSnapshot = copyRobots(state.robots);
        const targetRobotLeftTarget = initTargetRobotLeftTarget(state.currentTarget, state.robots);
        return {
          ...state,
          biddingOpen: false,
          phase: "solving",
          currentBidIndex: 0,
          moveCount: 0,
          robotsSnapshot,
          targetRobotLeftTarget,
          confirmedBidders: [],
        };
      }

      case "skip-target": {
        return advanceTarget({ ...state, lastFailureRobots: null });
      }

      case "move-robot": {
        const { color, direction } = move;
        const prevPos = state.robots[color];

        const newPos = simulateRobotMove(
          state.robots,
          state.rightWalls,
          state.bottomWalls,
          color,
          direction,
        );

        const newRobots = { ...state.robots, [color]: newPos };
        let { targetRobotLeftTarget } = state;

        // targetRobotLeftTarget の更新
        if (state.currentTarget) {
          if (state.currentTarget.color === "rainbow") {
            // 動かしたロボットが target.position にいた → 離れた
            if (
              prevPos.row === state.currentTarget.position.row &&
              prevPos.col === state.currentTarget.position.col
            ) {
              targetRobotLeftTarget = true;
            }
          } else if (color === state.currentTarget.color) {
            // 対象色ロボットが target.position にいた → 離れた
            if (
              prevPos.row === state.currentTarget.position.row &&
              prevPos.col === state.currentTarget.position.col
            ) {
              targetRobotLeftTarget = true;
            }
          }
        }

        const newMoveCount = state.moveCount + 1;
        const newState: HyperRobotState = {
          ...state,
          robots: newRobots,
          moveCount: newMoveCount,
          targetRobotLeftTarget,
        };

        // 達成チェック
        if (state.currentTarget && isTargetAchieved(newRobots, state.currentTarget, targetRobotLeftTarget)) {
          const newChips = { ...state.chips, [playerId]: (state.chips[playerId] ?? 0) + 1 };
          const currentChips = newChips[playerId]!;
          const wonTargets = {
            ...newState.wonTargets,
            [playerId]: [...(newState.wonTargets[playerId] ?? []), state.currentTarget.id],
          };

          if (currentChips >= state.winChips) {
            // 勝利（revealing なし）
            return {
              ...newState,
              chips: newChips,
              wonTargets,
              phase: "finished",
            };
          }
          // チップ開示フェーズへ
          return {
            ...newState,
            chips: newChips,
            wonTargets,
            phase: "revealing",
            revealingTarget: state.currentTarget,
            revealingPlayer: playerId,
          };
        }

        // 手数上限チェック
        const currentBid = state.bids[state.currentBidIndex];
        if (currentBid && newMoveCount >= currentBid.count) {
          return nextSolver(newState);
        }

        return newState;
      }

      case "give-up": {
        return nextSolver(state);
      }

      case "confirm-bid": {
        const newConfirmed = [...state.confirmedBidders, playerId];
        const allConfirmed = state.bids.length > 0 && state.playerIds.every(id => newConfirmed.includes(id));
        if (allConfirmed) {
          const robotsSnapshot = copyRobots(state.robots);
          const targetRobotLeftTarget = initTargetRobotLeftTarget(state.currentTarget, state.robots);
          return {
            ...state,
            biddingOpen: false,
            phase: "solving",
            currentBidIndex: 0,
            moveCount: 0,
            robotsSnapshot,
            targetRobotLeftTarget,
            confirmedBidders: [],
          };
        }
        return { ...state, confirmedBidders: newConfirmed };
      }

      case "unconfirm-bid": {
        return { ...state, confirmedBidders: state.confirmedBidders.filter(id => id !== playerId) };
      }

      case "next-target": {
        return advanceTarget({
          ...state,
          revealingTarget: null,
          revealingPlayer: "",
          lastFailureRobots: null,
        });
      }
    }
  },

  getCurrentPlayerId(state: HyperRobotState): string {
    switch (state.phase) {
      case "configuring":
        return state.playerIds[0] ?? "";
      case "bidding":
        return "";
      case "solving":
        return state.bids[state.currentBidIndex]?.playerId ?? "";
      case "revealing":
        return "";
      case "finished":
        return "";
    }
  },

  getStatus(state: HyperRobotState) {
    return state.phase === "finished" ? "finished" : "playing";
  },

  getRanking(state: HyperRobotState): string[] | null {
    if (state.phase !== "finished") return null;

    // chips の降順ソート
    const sorted = [...state.playerIds].sort((a, b) => {
      return (state.chips[b] ?? 0) - (state.chips[a] ?? 0);
    });

    // グループ化して引き分け判定
    const groups: string[][] = [];
    let currentGroup: string[] = [sorted[0]!];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if ((state.chips[curr] ?? 0) === (state.chips[prev] ?? 0)) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    groups.push(currentGroup);

    // 複数グループが存在し、かつどれかに2人以上いたら引き分け判定...
    // 仕様: 全グループが1人なら配列、複数いたら null
    const hasMultipleInGroup = groups.some((g) => g.length > 1);
    if (hasMultipleInGroup) return null;

    return groups.flat();
  },

  getLogEntries(prevState: HyperRobotState, newState: HyperRobotState): GameLogEntry[] {
    const entries: GameLogEntry[] = [];

    // bids 変化 (新規追加 or 更新)
    for (const newBid of newState.bids) {
      const prevBid = prevState.bids.find((b) => b.playerId === newBid.playerId);
      if (!prevBid) {
        entries.push({
          playerId: newBid.playerId,
          message: `${newBid.count} 手を宣言`,
        });
      } else if (prevBid.count !== newBid.count) {
        entries.push({
          playerId: newBid.playerId,
          message: `${newBid.count} 手に更新`,
        });
      }
    }

    // phase bidding→solving
    if (prevState.phase === "bidding" && newState.phase === "solving") {
      const currentBid = newState.bids[newState.currentBidIndex];
      if (currentBid) {
        entries.push({
          playerId: currentBid.playerId,
          message: `解決開始（${currentBid.count} 手）`,
        });
      }
    }

    // ロボット移動
    if (prevState.phase === "solving" && newState.phase === "solving") {
      const prevBid = prevState.bids[prevState.currentBidIndex];
      const newBid = newState.bids[newState.currentBidIndex];
      if (newBid && prevState.moveCount < newState.moveCount) {
        // find which robot moved
        for (const color of ["red", "yellow", "green", "blue", "silver"] as RobotColor[]) {
          const prev = prevState.robots[color];
          const next = newState.robots[color];
          if (prev.row !== next.row || prev.col !== next.col) {
            const dirMap: Record<string, string> = {
              up: "上", down: "下", left: "左", right: "右",
            };
            // direction は state から取れないのでロボット位置差から推定
            let dir = "上";
            if (next.row > prev.row) dir = "下";
            else if (next.row < prev.row) dir = "上";
            else if (next.col > prev.col) dir = "右";
            else dir = "左";
            entries.push({
              playerId: newBid.playerId,
              message: `${colorName(color)} を ${dir} へ移動`,
              metadata: { robotColor: color },
            });
            break;
          }
        }
      }
      // 解決者変更（nextSolver）
      if (prevBid && newBid && prevBid.playerId !== newBid.playerId && newState.bids.length > 0) {
        entries.push({
          playerId: newBid.playerId,
          message: `次の解決者: ${newBid.count} 手`,
        });
      }
    }

    // chips 変化
    for (const pid of newState.playerIds) {
      const prevChips = prevState.chips[pid] ?? 0;
      const nextChips = newState.chips[pid] ?? 0;
      if (nextChips > prevChips) {
        const wonIds = newState.wonTargets[pid] ?? [];
        const wonId = wonIds.at(-1);
        const wonTarget = wonId != null ? newState.allTargets.find(t => t.id === wonId) : null;
        let iconIndex = 0;
        if (wonTarget) {
          const sameColorTargets = newState.allTargets
            .filter(t => t.color === wonTarget.color)
            .sort((a, b) => a.id - b.id);
          const idx = sameColorTargets.findIndex(t => t.id === wonTarget.id);
          iconIndex = idx >= 0 ? idx : 0;
        }
        entries.push({
          playerId: pid,
          message: `を獲得！（計 ${nextChips} 枚）`,
          tag: "獲得",
          tagColor: "#16a34a",
          metadata: {
            targetColor: wonTarget?.color,
            iconIndex,
          },
        });
      }
    }

    // 全員失敗 (bidsが空になった && phase==="bidding" && biddingOpen)
    if (
      prevState.phase === "solving" &&
      newState.phase === "bidding" &&
      newState.bids.length === 0 &&
      newState.biddingOpen
    ) {
      if (prevState.isRetry) {
        // リトライ中の全員失敗 → ターゲットスキップ
        entries.push({
          playerId: newState.playerIds[0] ?? "",
          message: "リトライも全員失敗。次のターゲットへ",
          tag: "スキップ",
          tagColor: "#f59e0b",
        });
      } else {
        // 1回目の全員失敗 → 再宣言
        entries.push({
          playerId: newState.playerIds[0] ?? "",
          message: "全員失敗。再宣言（1回限り）",
          tag: "失敗",
          tagColor: "#dc2626",
        });
      }
    }

    // skip-target
    if (
      prevState.currentTarget?.id !== newState.currentTarget?.id &&
      prevState.phase === "bidding" &&
      newState.phase === "bidding" &&
      prevState.bids.length === 0
    ) {
      entries.push({
        playerId: newState.playerIds[0] ?? "",
        message: "時間切れ。次のターゲットへ",
      });
    }

    return entries;
  },
};

function colorName(color: RobotColor): string {
  const names: Record<RobotColor, string> = {
    red: "赤",
    yellow: "黄",
    green: "緑",
    blue: "青",
    silver: "銀",
  };
  return names[color];
}
