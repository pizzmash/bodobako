// ---------------------------------------------------------------------------
// ブロックス — ゲームロジック
// ---------------------------------------------------------------------------

import {
  BOARD_MASK,
  cornerBitFor,
  getCornerAdjacent,
  getEdgeAdjacent,
  pieceToBitboard,
  popcount,
  toBigInt,
  toHex,
} from "./bitboard.js";
import { PIECES } from "./pieces.js";
import type { BlocksState, ColorBoards } from "./types.js";
import { BOARD_SIZE, NUM_COLORS, START_CORNERS } from "./types.js";

// ---------------------------------------------------------------------------
// 配置判定
// ---------------------------------------------------------------------------

/**
 * 指定した色のピースを (row, col) 中心に配置できるか判定する。
 */
export function canPlace(
  state: BlocksState,
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

  // ビットボード生成（盤面外ならnull）
  const pieceBB = pieceToBitboard(variant.cells, row, col);
  if (pieceBB === null) return false;

  // 既存セルとの重複チェック
  const allOccupied = getAllOccupied(state.boards);
  if ((pieceBB & allOccupied) !== 0n) return false;

  const sameColorBB = toBigInt(state.boards[colorIndex]);

  // 初手: 開始角をカバーしているか
  if (!state.hasPlacedFirst[colorIndex]) {
    const corner = cornerBitFor(colorIndex);
    return (pieceBB & corner) !== 0n;
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
  return (
    toBigInt(boards[0]) |
    toBigInt(boards[1]) |
    toBigInt(boards[2]) |
    toBigInt(boards[3])
  );
}

// ---------------------------------------------------------------------------
// 有効手の存在チェック
// ---------------------------------------------------------------------------

/**
 * 指定色に有効手が1つでも存在するか。
 * 計算コストが高いため、全探索をできるだけ早く打ち切る。
 */
export function hasAnyValidMove(
  state: BlocksState,
  colorIndex: number,
): boolean {
  const remaining = state.remainingPieces[colorIndex];
  if (remaining === 0) return false;

  const allOccupied = getAllOccupied(state.boards);
  const sameColorBB = toBigInt(state.boards[colorIndex]);

  // 初手未配置の場合
  if (!state.hasPlacedFirst[colorIndex]) {
    const [cr, cc] = START_CORNERS[colorIndex];
    // 開始角が埋まっていたら配置不可
    if ((allOccupied & cornerBitFor(colorIndex)) !== 0n) return false;

    // 残存ピースの各バリアントで開始角をカバーできるか
    for (let pid = 0; pid < PIECES.length; pid++) {
      if ((remaining & (1 << pid)) === 0) continue;
      const piece = PIECES[pid];
      for (let vi = 0; vi < piece.variants.length; vi++) {
        const variant = piece.variants[vi];
        // ピースのセルで (cr, cc) を含む配置を探す
        for (const [dr, dc] of variant.cells) {
          const row = cr - dr;
          const col = cc - dc;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          // 初手なので辺・角チェック不要（角をカバーしていればOK）
          return true;
        }
      }
    }
    return false;
  }

  // 2手目以降: 角接触候補セルを起点に探索
  // 有効角候補 = 同色の角隣接 かつ 空き かつ 同色の辺隣接でない
  const candidateCorners =
    getCornerAdjacent(sameColorBB) & ~allOccupied & ~getEdgeAdjacent(sameColorBB) & BOARD_MASK;

  if (candidateCorners === 0n) return false;

  // 候補セルを列挙
  const candidatePositions = bigintBitPositions(candidateCorners);

  for (let pid = 0; pid < PIECES.length; pid++) {
    if ((remaining & (1 << pid)) === 0) continue;
    const piece = PIECES[pid];
    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const pos of candidatePositions) {
        const anchorRow = Math.floor(pos / BOARD_SIZE);
        const anchorCol = pos % BOARD_SIZE;
        // ピースのセルの一つが候補位置に乗るような配置を試行
        for (const [dr, dc] of variant.cells) {
          const row = anchorRow - dr;
          const col = anchorCol - dc;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          if ((getEdgeAdjacent(bb) & sameColorBB) !== 0n) continue;
          // 角接触は候補位置を含んでいるので保証される
          return true;
        }
      }
    }
  }

  return false;
}

/** bigintのセットビット位置を列挙（内部用） */
function bigintBitPositions(bb: bigint): number[] {
  const positions: number[] = [];
  let v = bb;
  let idx = 0;
  while (v !== 0n) {
    if (v & 1n) positions.push(idx);
    v >>= 1n;
    idx++;
  }
  return positions;
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
 * 特定のピースについて、指定色で配置可能な全 (variantIndex, row, col) を列挙。
 * UIのプレビュー・ハイライト用。
 */
export function getValidPlacements(
  state: BlocksState,
  colorIndex: number,
  pieceId: number,
): Placement[] {
  const remaining = state.remainingPieces[colorIndex];
  if ((remaining & (1 << pieceId)) === 0) return [];

  const piece = PIECES[pieceId];
  const allOccupied = getAllOccupied(state.boards);
  const sameColorBB = toBigInt(state.boards[colorIndex]);
  const placements: Placement[] = [];

  // 重複排除用（同じ配置結果は1つだけ）
  const seen = new Set<string>();

  if (!state.hasPlacedFirst[colorIndex]) {
    // 初手: 開始角をカバーする配置
    const [cr, cc] = START_CORNERS[colorIndex];
    if ((allOccupied & cornerBitFor(colorIndex)) !== 0n) return [];

    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const [dr, dc] of variant.cells) {
        const row = cr - dr;
        const col = cc - dc;
        const key = `${vi},${row},${col}`;
        if (seen.has(key)) continue;
        const bb = pieceToBitboard(variant.cells, row, col);
        if (bb === null) continue;
        if ((bb & allOccupied) !== 0n) continue;
        seen.add(key);
        placements.push({ variantIndex: vi, row, col });
      }
    }
  } else {
    // 2手目以降
    const candidateCorners =
      getCornerAdjacent(sameColorBB) & ~allOccupied & ~getEdgeAdjacent(sameColorBB) & BOARD_MASK;
    if (candidateCorners === 0n) return [];

    const candidatePositions = bigintBitPositions(candidateCorners);

    for (let vi = 0; vi < piece.variants.length; vi++) {
      const variant = piece.variants[vi];
      for (const pos of candidatePositions) {
        const anchorRow = Math.floor(pos / BOARD_SIZE);
        const anchorCol = pos % BOARD_SIZE;
        for (const [dr, dc] of variant.cells) {
          const row = anchorRow - dr;
          const col = anchorCol - dc;
          const key = `${vi},${row},${col}`;
          if (seen.has(key)) continue;
          const bb = pieceToBitboard(variant.cells, row, col);
          if (bb === null) continue;
          if ((bb & allOccupied) !== 0n) continue;
          if ((getEdgeAdjacent(bb) & sameColorBB) !== 0n) continue;
          if ((getCornerAdjacent(bb) & sameColorBB) === 0n) continue;
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
 * 新しい state を返す（イミュータブル）。
 */
export function advanceColor(state: BlocksState): BlocksState {
  const eliminated = [...state.eliminated] as [boolean, boolean, boolean, boolean];
  let nextColor = state.currentColorIndex;
  let freeColorNextPlayer = state.freeColorNextPlayer;

  // 最大4色ループ（全色eliminated判定まで）
  for (let i = 0; i < NUM_COLORS; i++) {
    nextColor = (nextColor + 1) % NUM_COLORS;

    if (eliminated[nextColor]) continue;

    // この色に有効手があるかチェック
    const testState: BlocksState = {
      ...state,
      currentColorIndex: nextColor,
      eliminated,
      freeColorNextPlayer,
    };

    if (hasAnyValidMove(testState, nextColor)) {
      // 3人戦でフリーカラーのターンが来たらローテーション更新
      if (state.colorOwner[nextColor] === -1) {
        freeColorNextPlayer = (freeColorNextPlayer + 1) % state.playerIds.length;
      }
      return {
        ...state,
        currentColorIndex: nextColor,
        eliminated,
        freeColorNextPlayer,
        finished: false,
      };
    }

    // 有効手なし → eliminated
    eliminated[nextColor] = true;
  }

  // 全色 eliminated → ゲーム終了
  return {
    ...state,
    currentColorIndex: nextColor,
    eliminated,
    freeColorNextPlayer,
    finished: true,
  };
}

// ---------------------------------------------------------------------------
// スコア計算
// ---------------------------------------------------------------------------

/** 指定色の残存マス数（少ないほど良い） */
export function computeRemainingCells(state: BlocksState, colorIndex: number): number {
  const remaining = state.remainingPieces[colorIndex];
  let total = 0;
  for (let pid = 0; pid < PIECES.length; pid++) {
    if ((remaining & (1 << pid)) !== 0) {
      total += PIECES[pid].size;
    }
  }
  return total;
}

/** 指定プレイヤーの残存マス数（2人戦では2色合算） */
export function computePlayerRemainingCells(state: BlocksState, playerIndex: number): number {
  let total = 0;
  for (let c = 0; c < NUM_COLORS; c++) {
    if (state.colorOwner[c] === playerIndex) {
      total += computeRemainingCells(state, c);
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// 盤面→2D配列変換（UI描画用）
// ---------------------------------------------------------------------------

/**
 * 4色のビットボードから 20×20 の数値グリッドを生成。
 * 0 = 空, 1〜4 = 色1〜4
 */
export function boardToGrid(state: BlocksState): number[][] {
  const boards = state.boards.map(toBigInt);
  const grid: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    new Array(BOARD_SIZE).fill(0),
  );

  for (let c = 0; c < NUM_COLORS; c++) {
    let bb = boards[c];
    let idx = 0;
    while (bb !== 0n) {
      if (bb & 1n) {
        const row = Math.floor(idx / BOARD_SIZE);
        const col = idx % BOARD_SIZE;
        grid[row][col] = c + 1; // 1-indexed color
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

const ALL_PIECES_MASK = (1 << PIECES.length) - 1; // 2097151

/**
 * プレイヤー数に応じた初期状態を生成。
 */
export function createInitialState(playerIds: string[]): BlocksState {
  const n = playerIds.length;

  let colorOwner: [number, number, number, number];
  if (n === 2) {
    // 2人: 対角同士の色を操作
    colorOwner = [0, 1, 0, 1];
  } else if (n === 3) {
    // 3人: 色3はフリーカラー
    colorOwner = [0, 1, 2, -1];
  } else {
    // 4人: 各自1色
    colorOwner = [0, 1, 2, 3];
  }

  return {
    boards: ["0", "0", "0", "0"],
    remainingPieces: [ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK, ALL_PIECES_MASK],
    playerIds,
    currentColorIndex: 0,
    colorOwner,
    freeColorNextPlayer: 0,
    hasPlacedFirst: [false, false, false, false],
    eliminated: [false, false, false, false],
    finished: false,
  };
}

// ---------------------------------------------------------------------------
// ピース配置適用
// ---------------------------------------------------------------------------

/**
 * ピースを配置して新しい state を返す。
 * バリデーションは呼び出し側で済ませていること前提。
 */
export function applyMove(
  state: BlocksState,
  colorIndex: number,
  pieceId: number,
  variantIndex: number,
  row: number,
  col: number,
): BlocksState {
  const piece = PIECES[pieceId];
  const variant = piece.variants[variantIndex];
  const pieceBB = pieceToBitboard(variant.cells, row, col)!;

  // ボード更新
  const newBoards = [...state.boards] as [string, string, string, string];
  newBoards[colorIndex] = toHex(toBigInt(newBoards[colorIndex]) | pieceBB);

  // ピース消費
  const newRemaining = [...state.remainingPieces] as [number, number, number, number];
  newRemaining[colorIndex] = newRemaining[colorIndex] & ~(1 << pieceId);

  // 初手フラグ更新
  const newHasPlacedFirst = [...state.hasPlacedFirst] as [boolean, boolean, boolean, boolean];
  newHasPlacedFirst[colorIndex] = true;

  const newState: BlocksState = {
    ...state,
    boards: newBoards,
    remainingPieces: newRemaining,
    hasPlacedFirst: newHasPlacedFirst,
  };

  // 手番進行（自動スキップ含む）
  return advanceColor(newState);
}

// ---------------------------------------------------------------------------
// 現在の手番プレイヤーID取得
// ---------------------------------------------------------------------------

/**
 * 現在手番のプレイヤーIDを返す。
 * フリーカラーの場合は freeColorNextPlayer で決まるプレイヤー。
 */
export function getCurrentPlayerId(state: BlocksState): string {
  const owner = state.colorOwner[state.currentColorIndex];
  if (owner === -1) {
    // フリーカラー（3人戦）
    return state.playerIds[state.freeColorNextPlayer];
  }
  return state.playerIds[owner];
}
