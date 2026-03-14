// ---------------------------------------------------------------------------
// ブロックストライゴン — GameDefinition 実装
// ---------------------------------------------------------------------------

import type { GameDefinition, GameLogEntry, GameStatus } from "../../types/game.js";
import {
    applyMove,
    canPlace,
    computePlayerPenalty,
    createInitialState,
    getCurrentPlayerId,
} from "./logic.js";
import { PIECES } from "./pieces.js";
import type { BlokusTrigonMove, BlokusTrigonState } from "./types.js";
import { GRID_COLS, GRID_ROWS, NUM_PIECES } from "./types.js";

/** 色の日本語名 */
const COLOR_NAMES = ["青", "黄", "赤", "緑", "紫", "橙"] as const;

export const blokusTrigonDefinition: GameDefinition<BlokusTrigonState, BlokusTrigonMove> = {
  id: "blokus-trigon",
  name: "ブロックストライゴン",
  description:
    "三角形のピースを角で繋げて配置する六角形盤面の陣取りゲーム",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(playerIds: string[]): BlokusTrigonState {
    return createInitialState(playerIds);
  },

  parseMove(raw: unknown): BlokusTrigonMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;

    if (typeof m.pieceId !== "number" || typeof m.variantIndex !== "number") return null;
    if (typeof m.row !== "number" || typeof m.col !== "number") return null;

    const pieceId = m.pieceId as number;
    const variantIndex = m.variantIndex as number;
    const row = m.row as number;
    const col = m.col as number;

    if (
      !Number.isInteger(pieceId) ||
      !Number.isInteger(variantIndex) ||
      !Number.isInteger(row) ||
      !Number.isInteger(col)
    )
      return null;

    if (pieceId < 0 || pieceId >= NUM_PIECES) return null;
    if (variantIndex < 0 || variantIndex >= PIECES[pieceId].variants.length) return null;
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;

    return { pieceId, variantIndex, row, col };
  },

  validateMove(
    state: BlokusTrigonState,
    move: BlokusTrigonMove,
    playerId: string,
  ): boolean {
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
    state: BlokusTrigonState,
    move: BlokusTrigonMove,
    _playerId: string,
  ): BlokusTrigonState {
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

  getStatus(state: BlokusTrigonState): GameStatus {
    return state.finished ? "finished" : "playing";
  },

  getRanking(state: BlokusTrigonState): string[] | null {
    if (!state.finished) return null;

    const scores: { playerId: string; penalty: number }[] =
      state.playerIds.map((pid, idx) => ({
        playerId: pid,
        penalty: computePlayerPenalty(state, idx),
      }));

    scores.sort((a, b) => a.penalty - b.penalty);

    // 全員同点なら引き分け
    if (scores.every((s) => s.penalty === scores[0].penalty)) return null;

    return scores.map((s) => s.playerId);
  },

  getCurrentPlayerId(state: BlokusTrigonState): string {
    return getCurrentPlayerId(state);
  },

  getLogEntries(
    prevState: BlokusTrigonState,
    newState: BlokusTrigonState,
  ): GameLogEntry[] {
    if (!newState.lastMove) return [];

    const { colorIndex } = newState.lastMove;
    const owner = prevState.colorOwner[colorIndex];
    const playerId = prevState.playerIds[owner];
    // 配置されたピースを特定
    const prevRemaining = prevState.remainingPieces[colorIndex];
    const newRemaining = newState.remainingPieces[colorIndex];
    const diff = prevRemaining & ~newRemaining;
    let pieceId = -1;
    for (let pid = 0; pid < PIECES.length; pid++) {
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
