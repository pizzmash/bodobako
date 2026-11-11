import type { GameDefinition } from "../../types/game.js";
import type { BluffitState, BluffitMove } from "./types.js";
import { applyMove, createInitialState, getPlayerView, getRanking, validateMove } from "./logic.js";

export const bluffitDefinition: GameDefinition<BluffitState, BluffitMove> = {
  id: "bluffit",
  name: "ブラフィット",
  description: "伏せた1枚で読み合うBLUFFIT。場の得点を取るか、一騎打ちで奪うか。",
  minPlayers: 2,
  maxPlayers: 6,
  createInitialState,
  validateMove,
  applyMove,
  getPlayerView,
  getRanking,
  getCurrentPlayerId: (s) => (s.phase === "claim" ? s.order[s.turn] : ""),
  getStatus: (s) => (s.phase === "finished" ? "finished" : "playing"),
  parseMove(raw) {
    if (!raw || typeof raw !== "object" || !("type" in raw) || !("round" in raw)) return null;
    const round = raw.round;
    if (typeof round !== "number" || !Number.isInteger(round) || round < 1 || round > 11) return null;
    if (raw.type === "reveal") return { type: "reveal", round };
    if (raw.type === "challenge" && "target" in raw && typeof raw.target === "string")
      return { type: "challenge", target: raw.target, round };
    if (
      (raw.type === "bid" || raw.type === "take") &&
      "value" in raw &&
      typeof raw.value === "number" &&
      Number.isInteger(raw.value) &&
      raw.value >= 1 &&
      raw.value <= 10
    )
      return { type: raw.type, value: raw.value, round };
    return null;
  },
  getLogEntries(prev, next) {
    if (prev.phase !== "claim") return [];
    const id = prev.order[prev.turn];
    if (next.pendingDuel) return [{ playerId: id, message: `${next.pendingDuel.prize} 点の札に挑戦` }];
    const duel = next.duels.length > prev.duels.length ? next.duels.at(-1) : null;
    if (duel) return [{ playerId: duel.winner, message: `一騎打ちで ${duel.prize} を確保` }];
    const value = next.claims[id] ?? next.lastAwards?.prizes[id];
    return [
      {
        playerId: id,
        message: value === undefined ? "場札を確保してラウンド終了" : `場から ${value} を確保`,
      },
    ];
  },
};
