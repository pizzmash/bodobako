// ---------------------------------------------------------------------------
// ブロックストライゴン — ゲームロジック
// ---------------------------------------------------------------------------

import {
    BORDER_MASK,
    VALID_MASK,
    bitPositions,
    getCornerAdjacent,
    getEdgeAdjacent,
    isValidCell,
    pieceToBitboard,
    startBitFor,
    toBigInt,
    toHex
} from "./board.js";
import { PIECES } from "./pieces.js";
import type { BlokusTrigonState, ColorBoards } from "./types.js";
import { GRID_COLS, GRID_ROWS, START_POSITIONS, START_POSITIONS_3P } from "./types.js";

/** numColors に応じた開始位置配列を返す */
function startPositionsFor(numColors: number): typeof START_POSITIONS {
  return numColors === 3 ? START_POSITIONS_3P : START_POSITIONS;
}

// ---------------------------------------------------------------------------
// 配置判定
// ---------------------------------------------------------------------------

/**
 * 指定した色のピースを (row, col) 中心に配置できるか判定する。
 */
export function canPlace(
  state: BlokusTrigonState,
  colorIndex: number,
  pieceId: number,
  variantIndex: number,
  row: number,
  col: number,
): boolean {
  // ピース残存チェック
  if ((state.remainingPieces[colorIndex] & (1 << pieceId)) === 0) return false;

  const piece = PIECES[pieceId];
  if (!piece || variantIndex < 0 || variantIndex >= piece.variants.length) return false;

  const variant = piece.variants[variantIndex];

  // パリティチェック: バリアントの baseParity と配置先が一致する必要がある
  if (variant.baseParity !== (row + col) % 2) return false;

  // ビットボード生成（盤面外 or VALID_MASK 外ならnull）
  const pieceBB = pieceToBitboard(variant.cells, row, col);
  if (pieceBB === null) return false;

  // 3人戦の外周制限
  if (state.borderRestriction && (pieceBB & BORDER_MASK) !== 0n) return false;

  // 既存セルとの重複チェック
  const allOccupied = getAllOccupied(state.boards);
  if ((pieceBB & allOccupied) !== 0n) return false;

  const sameColorBB = toBigInt(state.boards[colorIndex]);

  // 初手: スタートマスをカバーしているか
  if (!state.hasPlacedFirst[colorIndex]) {
    const startBit = startBitFor(colorIndex, startPositionsFor(state.numColors));
    return (pieceBB & startBit) !== 0n;
  }

  // 2手目以降: 同色辺接触なし & 同色角接触あり
  if ((getEdgeAdjacent(pieceBB) & sameColorBB) !== 0n) return false;
  if ((getCornerAdjacent(pieceBB) & sameColorBB) === 0n) return false;

  return true;
}

// ---------------------------------------------------------------------------
// 全占有セルの計算
// ---------------------------------------------------------------------------

function getAllOccupied(boards: ColorBoards): bigint {
  let occ = 0n;
  for (const b of boards) {
    occ |= toBigInt(b);
  }
  return occ;
}

// ---------------------------------------------------------------------------
// 有効手の存在チェック
// ---------------------------------------------------------------------------

/**
 * 指定色に有効手が1つでも存在するか。
 */
export function hasAnyValidMove(
  state: BlokusTrigonState,
  colorIndex: number,
): boolean {
  const remaining = state.remainingPieces[colorIndex];
  if (remaining === 0) return false;

  const allOccupied = getAllOccupied(state.boards);
  const sameColorBB = toBigInt(state.boards[colorIndex]);

  // 初手未配置の場合
  if (!state.hasPlacedFirst[colorIndex]) {
    const startPositions = startPositionsFor(state.numColors);
    const [sr, sc] = startPositions[colorIndex];
    // スタートマスが埋まっていたら配置不可
    if ((allOccupied & startBitFor(colorIndex, startPositions)) !== 0n) return false;

    for (let pid = 0; pid < PIECES.length; pid++) {
      if ((remaining & (1 << pid)) === 0) continue;
      const piece = PIECES[pid];
      for (let vi = 0; vi < piece.variants.length; vi++) {
        const variant = piece.variants[vi];
        for (const [dr, dc] of variant.cells) {
          const row = sr - dr;
          const col = sc - dc;
          if (variant.baseParity !== (row + col) % 2) continue;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          if (state.borderRestriction && (bb & BORDER_MASK) !== 0n) continue;
          return true;
        }
      }
    }
    return false;
  }

  // 2手目以降: 角接触候補セルを起点に探索
  const candidateCorners =
    getCornerAdjacent(sameColorBB) & ~allOccupied & ~getEdgeAdjacent(sameColorBB) & VALID_MASK;

  if (candidateCorners === 0n) return false;

  const candidatePositions = bitPositions(candidateCorners);

  for (let pid = 0; pid < PIECES.length; pid++) {
    if ((remaining & (1 << pid)) === 0) continue;
    const piece = PIECES[pid];
    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const pos of candidatePositions) {
        const anchorRow = Math.floor(pos / GRID_COLS);
        const anchorCol = pos % GRID_COLS;
        for (const [dr, dc] of variant.cells) {
          const row = anchorRow - dr;
          const col = anchorCol - dc;
          if (variant.baseParity !== (row + col) % 2) continue;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          if ((getEdgeAdjacent(bb) & sameColorBB) !== 0n) continue;
          if (state.borderRestriction && (bb & BORDER_MASK) !== 0n) continue;
          return true;
        }
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 特定ピースの全有効配置列挙
// ---------------------------------------------------------------------------

export interface Placement {
  variantIndex: number;
  row: number;
  col: number;
}

/**
 * 特定ピースについて、指定色で配置可能な全 (variantIndex, row, col) を列挙。
 */
export function getValidPlacements(
  state: BlokusTrigonState,
  colorIndex: number,
  pieceId: number,
): Placement[] {
  const remaining = state.remainingPieces[colorIndex];
  if ((remaining & (1 << pieceId)) === 0) return [];

  const piece = PIECES[pieceId];
  const allOccupied = getAllOccupied(state.boards);
  const sameColorBB = toBigInt(state.boards[colorIndex]);
  const placements: Placement[] = [];
  const seen = new Set<string>();

  if (!state.hasPlacedFirst[colorIndex]) {
    const startPositions = startPositionsFor(state.numColors);
    const [sr, sc] = startPositions[colorIndex];
    if ((allOccupied & startBitFor(colorIndex, startPositions)) !== 0n) return [];

    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const [dr, dc] of variant.cells) {
        const row = sr - dr;
        const col = sc - dc;
        if (variant.baseParity !== (row + col) % 2) continue;
        const key = `${vi},${row},${col}`;
        if (seen.has(key)) continue;
        const bb = pieceToBitboard(variant.cells, row, col);
        if (bb === null) continue;
        if ((bb & allOccupied) !== 0n) continue;
        if (state.borderRestriction && (bb & BORDER_MASK) !== 0n) continue;
        seen.add(key);
        placements.push({ variantIndex: vi, row, col });
      }
    }
  } else {
    const candidateCorners =
      getCornerAdjacent(sameColorBB) & ~allOccupied & ~getEdgeAdjacent(sameColorBB) & VALID_MASK;
    if (candidateCorners === 0n) return [];

    const candidatePositions = bitPositions(candidateCorners);

    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const pos of candidatePositions) {
        const anchorRow = Math.floor(pos / GRID_COLS);
        const anchorCol = pos % GRID_COLS;
        for (const [dr, dc] of variant.cells) {
          const row = anchorRow - dr;
          const col = anchorCol - dc;
          if (variant.baseParity !== (row + col) % 2) continue;
          const key = `${vi},${row},${col}`;
          if (seen.has(key)) continue;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          if ((getEdgeAdjacent(bb) & sameColorBB) !== 0n) continue;
          if ((getCornerAdjacent(bb) & sameColorBB) === 0n) continue;
          if (state.borderRestriction && (bb & BORDER_MASK) !== 0n) continue;
          seen.add(key);
          placements.push({ variantIndex: vi, row, col });
        }
      }
    }
  }

  return placements;
}

// ---------------------------------------------------------------------------
// 手番進行（自動スキップ含む）
// ---------------------------------------------------------------------------

/**
 * 次の手番色に進める。置けない色は自動で eliminated にしてスキップ。
 * 全色 eliminated になったら finished = true。
 */
export function advanceColor(state: BlokusTrigonState): BlokusTrigonState {
  const eliminated = [...state.eliminated];
  let nextColor = state.currentColorIndex;

  for (let i = 0; i < state.numColors; i++) {
    nextColor = (nextColor + 1) % state.numColors;

    if (eliminated[nextColor]) continue;

    const testState: BlokusTrigonState = {
      ...state,
      currentColorIndex: nextColor,
      eliminated,
    };

    if (hasAnyValidMove(testState, nextColor)) {
      return {
        ...state,
        currentColorIndex: nextColor,
        eliminated,
        finished: false,
      };
    }

    eliminated[nextColor] = true;
  }

  return {
    ...state,
    currentColorIndex: nextColor,
    eliminated,
    finished: true,
  };
}

// ---------------------------------------------------------------------------
// スコア計算
// ---------------------------------------------------------------------------

/** 指定色の残存セル数（少ないほど良い） */
export function computeRemainingCells(state: BlokusTrigonState, colorIndex: number): number {
  const remaining = state.remainingPieces[colorIndex];
  let total = 0;
  for (let pid = 0; pid < PIECES.length; pid++) {
    if ((remaining & (1 << pid)) !== 0) {
      total += PIECES[pid].size;
    }
  }
  return total;
}

/**
 * 指定色のペナルティ = 残りセル数 - ボーナス（小さいほど良い）。
 * ボーナス: 全ピース使い切り → +15, さらに最後のピースが1マス → +5
 */
export function computePenalty(state: BlokusTrigonState, colorIndex: number): number {
  const remainingCells = computeRemainingCells(state, colorIndex);
  let bonus = 0;
  if (remainingCells === 0) {
    bonus += 15;
    if (state.lastPieceSize[colorIndex] === 1) {
      bonus += 5;
    }
  }
  return remainingCells - bonus;
}

/** 指定プレイヤーのペナルティ（2人戦では2色合算、小さいほど良い） */
export function computePlayerPenalty(state: BlokusTrigonState, playerIndex: number): number {
  let total = 0;
  for (let c = 0; c < state.numColors; c++) {
    if (state.colorOwner[c] === playerIndex) {
      total += computePenalty(state, c);
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// 盤面→2D配列変換（UI描画用）
// ---------------------------------------------------------------------------

/**
 * ビットボードから 18×35 の数値グリッドを生成。
 * -1 = 無効セル (VALID_MASK外), 0 = 空, 1〜N = 色1〜N
 */
export function boardToGrid(state: BlokusTrigonState): number[][] {
  const boards = state.boards.map(toBigInt);
  const grid: number[][] = Array.from({ length: GRID_ROWS }, () =>
    new Array(GRID_COLS).fill(-1),
  );

  // 有効セルを0(空)で初期化
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (isValidCell(r, c)) {
        grid[r][c] = 0;
      }
    }
  }

  for (let c = 0; c < boards.length; c++) {
    let bb = boards[c];
    let idx = 0;
    while (bb !== 0n) {
      if (bb & 1n) {
        const row = Math.floor(idx / GRID_COLS);
        const col = idx % GRID_COLS;
        grid[row][col] = c + 1;
      }
      bb >>= 1n;
      idx++;
    }
  }

  return grid;
}

// ---------------------------------------------------------------------------
// 初期状態生成
// ---------------------------------------------------------------------------

export const ALL_PIECES_MASK = (1 << PIECES.length) - 1;

/**
 * プレイヤー数に応じた初期状態を生成。
 */
export function createInitialState(playerIds: string[]): BlokusTrigonState {
  const n = playerIds.length;

  let colorOwner: number[];
  let numColors: number;
  let borderRestriction = false;

  if (n === 2) {
    // 2人: P1=色0+色2, P2=色1+色3。ターン順: 0→1→2→3
    colorOwner = [0, 1, 0, 1];
    numColors = 4;
  } else if (n === 3) {
    // 3人: 各自1色、外周制限あり
    colorOwner = [0, 1, 2];
    numColors = 3;
    borderRestriction = true;
  } else {
    // 4人: 各自1色
    colorOwner = [0, 1, 2, 3];
    numColors = 4;
  }

  const boards: string[] = new Array(numColors).fill("0");
  const remainingPieces: number[] = new Array(numColors).fill(ALL_PIECES_MASK);
  const hasPlacedFirst: boolean[] = new Array(numColors).fill(false);
  const eliminated: boolean[] = new Array(numColors).fill(false);
  const lastPieceSize: number[] = new Array(numColors).fill(0);

  return {
    boards,
    remainingPieces,
    playerIds,
    currentColorIndex: 0,
    colorOwner,
    numColors,
    hasPlacedFirst,
    eliminated,
    lastPieceSize,
    borderRestriction,
    finished: false,
  };
}

// ---------------------------------------------------------------------------
// ピース配置適用
// ---------------------------------------------------------------------------

/**
 * ピースを配置して新しい state を返す。
 */
export function applyMove(
  state: BlokusTrigonState,
  colorIndex: number,
  pieceId: number,
  variantIndex: number,
  row: number,
  col: number,
): BlokusTrigonState {
  const piece = PIECES[pieceId];
  const variant = piece.variants[variantIndex];
  const pieceBB = pieceToBitboard(variant.cells, row, col)!;

  // ボード更新
  const newBoards = [...state.boards];
  newBoards[colorIndex] = toHex(toBigInt(newBoards[colorIndex]) | pieceBB);

  // ピース消費
  const newRemaining = [...state.remainingPieces];
  newRemaining[colorIndex] = newRemaining[colorIndex] & ~(1 << pieceId);

  // 初手フラグ更新
  const newHasPlacedFirst = [...state.hasPlacedFirst];
  newHasPlacedFirst[colorIndex] = true;

  // 最後のピースサイズ更新
  const newLastPieceSize = [...state.lastPieceSize];
  newLastPieceSize[colorIndex] = piece.size;

  // 直近配置ピースのセル座標
  const lastMoveCells = variant.cells.map(([dr, dc]) => [row + dr, col + dc] as const);

  const newState: BlokusTrigonState = {
    ...state,
    boards: newBoards,
    remainingPieces: newRemaining,
    hasPlacedFirst: newHasPlacedFirst,
    lastPieceSize: newLastPieceSize,
    lastMove: { colorIndex, cells: lastMoveCells },
  };

  return advanceColor(newState);
}

// ---------------------------------------------------------------------------
// 現在の手番プレイヤーID取得
// ---------------------------------------------------------------------------

export function getCurrentPlayerId(state: BlokusTrigonState): string {
  const owner = state.colorOwner[state.currentColorIndex];
  return state.playerIds[owner];
}
