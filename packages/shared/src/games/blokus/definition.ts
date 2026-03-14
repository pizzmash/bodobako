// ---------------------------------------------------------------------------
// ブロックス — GameDefinition 実装
// ---------------------------------------------------------------------------

import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
import {
  applyMove,
  canPlace,
  computePlayerRemainingCells,
  createInitialState,
  getCurrentPlayerId,
} from "./logic.js";
import { PIECES } from "./pieces.js";
import type { BlokusMove, BlokusState } from "./types.js";
import { BOARD_SIZE, NUM_PIECES } from "./types.js";

export const blokusDefinition: GameDefinition<BlokusState, BlokusMove> = {
  id: "blokus",
  name: "ブロックス",
  description:
    "20×20 の盤面にピースを角で繋げて配置する陣取りゲーム",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(playerIds: string[]): BlokusState {
    return createInitialState(playerIds);
  },

  parseMove(raw: unknown): BlokusMove | null {
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
    state: BlokusState,
    move: BlokusMove,
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
    state: BlokusState,
    move: BlokusMove,
    _playerId: string,
  ): BlokusState {
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

  getStatus(state: BlokusState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: BlokusState): string[] | null {
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

  getCurrentPlayerId(state: BlokusState): string {
    return getCurrentPlayerId(state);
  },

  getLogEntries(
    prevState: BlokusState,
    newState: BlokusState,
  ): GameLogEntry[] {
    if (!newState.lastMove) return [];

    const { colorIndex } = newState.lastMove;
    const owner = prevState.colorOwner[colorIndex];
    // 3人戦のフリーカラー（owner=-1）は記録しない
    if (owner < 0) return [];

    const playerId = prevState.playerIds[owner];
    // 配置されたピースを特定
    const prevRemaining = prevState.remainingPieces[colorIndex];
    const newRemaining = newState.remainingPieces[colorIndex];
    const diff = prevRemaining & ~newRemaining;
    let pieceId = -1;
    for (let pid = 0; pid < NUM_PIECES; pid++) {
      if (diff & (1 << pid)) {
        pieceId = pid;
        break;
      }
    }

    const pieceSize = pieceId >= 0 ? (PIECES[pieceId]?.size ?? 0) : 0;
    return [{
      message: "を配置",
      playerId,
      metadata: { pieceId, colorIndex, pieceSize },
    }];
  },
};
