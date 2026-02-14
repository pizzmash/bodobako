import type {
  BuildingPos,
  IntersectionPos,
  CitychaseState,
  RevealedTrace,
} from "./types.js";

// === 定数 ===
export const BOARD_SIZE = 5; // 5×5 ビル
export const INTERSECTION_SIZE = 4; // 4×4 交差点
export const HELICOPTER_COUNT = 3;
export const MAX_ROUNDS = 11;

// === 座標ヘルパー ===

export function posKey(pos: BuildingPos | IntersectionPos): string {
  return `${pos.row},${pos.col}`;
}

export function parsePos(key: string): BuildingPos {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export function isSamePos(
  a: BuildingPos | IntersectionPos | null,
  b: BuildingPos | IntersectionPos | null
): boolean {
  if (!a || !b) return false;
  return a.row === b.row && a.col === b.col;
}

// === 隣接関係 ===

/** ビルの上下左右隣接ビル */
export function getAdjacentBuildings(pos: BuildingPos): BuildingPos[] {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  return dirs
    .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
    .filter(
      (p) =>
        p.row >= 0 && p.row < BOARD_SIZE && p.col >= 0 && p.col < BOARD_SIZE
    );
}

/** 交差点の上下左右隣接交差点 */
export function getAdjacentIntersections(
  pos: IntersectionPos
): IntersectionPos[] {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  return dirs
    .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
    .filter(
      (p) =>
        p.row >= 0 &&
        p.row < INTERSECTION_SIZE &&
        p.col >= 0 &&
        p.col < INTERSECTION_SIZE
    );
}

/** 交差点(r,c)を囲む4つのビル: (r,c), (r,c+1), (r+1,c), (r+1,c+1) */
export function getSurroundingBuildings(
  pos: IntersectionPos
): BuildingPos[] {
  return [
    { row: pos.row, col: pos.col },
    { row: pos.row, col: pos.col + 1 },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row + 1, col: pos.col + 1 },
  ];
}

// === バリデーション ===

export function isValidBuildingPos(pos: BuildingPos): boolean {
  return (
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < BOARD_SIZE &&
    pos.col >= 0 &&
    pos.col < BOARD_SIZE
  );
}

export function isValidIntersectionPos(pos: IntersectionPos): boolean {
  return (
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < INTERSECTION_SIZE &&
    pos.col >= 0 &&
    pos.col < INTERSECTION_SIZE
  );
}

/** ヘリコプターが既に存在する交差点かどうか */
export function isOccupiedIntersection(
  helicopters: (IntersectionPos | null)[],
  pos: IntersectionPos,
  excludeIndex?: number
): boolean {
  return helicopters.some(
    (h, i) => h && i !== excludeIndex && isSamePos(h, pos)
  );
}

/** 交差点が隣接しているか */
export function isAdjacentIntersection(
  from: IntersectionPos,
  to: IntersectionPos
): boolean {
  const dr = Math.abs(from.row - to.row);
  const dc = Math.abs(from.col - to.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/** ビルが隣接しているか */
export function isAdjacentBuilding(
  from: BuildingPos,
  to: BuildingPos
): boolean {
  const dr = Math.abs(from.row - to.row);
  const dc = Math.abs(from.col - to.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/** ビルが交差点を囲む4つのビルに含まれるか */
export function isBuildingSurroundingIntersection(
  building: BuildingPos,
  intersection: IntersectionPos
): boolean {
  return getSurroundingBuildings(intersection).some((b) =>
    isSamePos(b, building)
  );
}

// === 犯人移動 ===

/** 犯人が移動可能なビル一覧（痕跡なしの隣接ビル） */
export function getValidCriminalMoves(state: CitychaseState): BuildingPos[] {
  if (!state.criminalPos) return [];
  return getAdjacentBuildings(state.criminalPos).filter(
    (b) => !(posKey(b) in state.traces)
  );
}

/** 犯人が移動可能かどうか */
export function canCriminalMove(state: CitychaseState): boolean {
  return getValidCriminalMoves(state).length > 0;
}

// === ヘリコプター担当割り当て ===

/**
 * 警察プレイヤーにヘリコプターを割り当てる
 * - 1人: 3基すべて
 * - 2人: 2基 + 1基（ランダム）
 * - 3人: 1基ずつ
 * 返り値: helicopterAssignments[i] = 担当playerId
 */
export function assignHelicopters(policeIds: string[]): string[] {
  if (policeIds.length === 1) {
    return [policeIds[0], policeIds[0], policeIds[0]];
  }
  if (policeIds.length === 2) {
    // ランダムで一方に2基、もう一方に1基
    const twoHeliPlayer =
      policeIds[Math.floor(Math.random() * 2)];
    const oneHeliPlayer = policeIds.find((id) => id !== twoHeliPlayer)!;
    return [twoHeliPlayer, twoHeliPlayer, oneHeliPlayer];
  }
  // 3人: シャッフルして1基ずつ
  const shuffled = [...policeIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// === ターン進行 ===

/** 現在のプレイヤーが担当するヘリコプターのインデックス一覧 */
export function getHelicoptersForPlayer(
  assignments: string[],
  playerId: string
): number[] {
  return assignments
    .map((id, i) => (id === playerId ? i : -1))
    .filter((i) => i >= 0);
}

/** 次のヘリ/プレイヤーに進む。全員完了ならnullを返す */
export function advancePolice(state: CitychaseState): {
  policeIndex: number;
  heliIndex: number;
} | null {
  const currentPlayerId = state.policeIds[state.currentPoliceIndex];
  const myHelis = getHelicoptersForPlayer(
    state.helicopterAssignments,
    currentPlayerId
  );
  const currentHeliPos = myHelis.indexOf(state.currentHelicopterIndex);

  // 同プレイヤーの次のヘリ
  if (currentHeliPos + 1 < myHelis.length) {
    return {
      policeIndex: state.currentPoliceIndex,
      heliIndex: myHelis[currentHeliPos + 1],
    };
  }

  // 次のプレイヤー
  for (let i = state.currentPoliceIndex + 1; i < state.policeIds.length; i++) {
    const nextHelis = getHelicoptersForPlayer(
      state.helicopterAssignments,
      state.policeIds[i]
    );
    if (nextHelis.length > 0) {
      return { policeIndex: i, heliIndex: nextHelis[0] };
    }
  }

  // 全員完了
  return null;
}

// === 捜索 ===

/** 痕跡ラウンドを公開するかどうか */
export function shouldRevealRound(round: number): boolean {
  return round === 1 || round === 6;
}

/** 捜索結果から公開痕跡情報を作成 */
export function createRevealedTrace(
  pos: BuildingPos,
  traceRound: number
): RevealedTrace {
  return {
    pos,
    round: shouldRevealRound(traceRound) ? traceRound : null,
  };
}
