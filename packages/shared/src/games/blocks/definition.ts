// ---------------------------------------------------------------------------
// ブロックス — GameDefinition 実装
// ---------------------------------------------------------------------------

import type { GameDefinition, GameStatus } from "../../types/game.js";
import { PIECES } from "./pieces.js";
import type { BlocksMove, BlocksState } from "./types.js";
import { BOARD_SIZE, NUM_COLORS, NUM_PIECES } from "./types.js";
import {
  applyMove,
  canPlace,
  computePlayerRemainingCells,
  createInitialState,
  getCurrentPlayerId,
} from "./logic.js";

export const blocksDefinition: GameDefinition<BlocksState, BlocksMove> = {
  id: "blocks",
  name: "ブロックス",
  description:
    "20×20 の盤面にピースを角で繋げて配置する陣取りゲーム（2〜4人）",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(playerIds: string[]): BlocksState {
    return createInitialState(playerIds);
  },

  parseMove(raw: unknown): BlocksMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;

    if (typeof m.pieceId !== "number" || typeof m.variantIndex !== "number") return null;
    if (typeof m.row !== "number" || typeof m.col !== "number") return null;

    const { pieceId, variantIndex, row, col } = m as {
      pieceId: number;
      variantIndex: number;
      row: number;
      col: number;
    };

    // 整数チェック
    if (
      !Number.isInteger(pieceId) ||
      !Number.isInteger(variantIndex) ||
      !Number.isInteger(row) ||
      !Number.isInteger(col)
    )
      return null;

    // 範囲チェック
    if (pieceId < 0 || pieceId >= NUM_PIECES) return null;
    if (variantIndex < 0 || variantIndex >= PIECES[pieceId].variants.length) return null;
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;

    return { pieceId, variantIndex, row, col };
  },

  validateMove(
    state: BlocksState,
    move: BlocksMove,
    playerId: string,
  ): boolean {
    // 手番チェック
    const currentPlayer = getCurrentPlayerId(state);
    if (playerId !== currentPlayer) return false;
    if (state.finished) return false;

    const colorIndex = state.currentColorIndex;
    return canPlace(
      state,
      colorIndex,
      move.pieceId,
      move.variantIndex,
      move.row,
      move.col,
    );
  },

  applyMove(
    state: BlocksState,
    move: BlocksMove,
    _playerId: string,
  ): BlocksState {
    const colorIndex = state.currentColorIndex;
    return applyMove(
      state,
      colorIndex,
      move.pieceId,
      move.variantIndex,
      move.row,
      move.col,
    );
  },

  getStatus(state: BlocksState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: BlocksState): string[] | null {
    if (!state.finished) return null;

    // 各プレイヤーの残存マス数を計算
    const scores: { playerId: string; remaining: number }[] =
      state.playerIds.map((pid, idx) => ({
        playerId: pid,
        remaining: computePlayerRemainingCells(state, idx),
      }));

    // 昇順ソート（残りが少ないほど上位）
    scores.sort((a, b) => a.remaining - b.remaining);

    // 全員同点なら引き分け
    if (scores.every((s) => s.remaining === scores[0].remaining)) return null;

    return scores.map((s) => s.playerId);
  },

  getCurrentPlayerId(state: BlocksState): string {
    return getCurrentPlayerId(state);
  },
};
