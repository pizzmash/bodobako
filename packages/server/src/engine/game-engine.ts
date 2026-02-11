import { getGameDefinition } from "@claude-demo/shared";
import type { GameResult } from "@claude-demo/shared";

export function startGame(
  gameId: string,
  playerIds: string[]
): unknown {
  const def = getGameDefinition(gameId);
  if (!def) throw new Error(`Unknown game: ${gameId}`);
  if (playerIds.length < def.minPlayers || playerIds.length > def.maxPlayers) {
    throw new Error(
      `${def.name} requires ${def.minPlayers}-${def.maxPlayers} players`
    );
  }
  return def.createInitialState(playerIds);
}

export function processMove(
  gameId: string,
  state: unknown,
  move: unknown,
  playerId: string
): { newState: unknown; result?: GameResult } | { error: string } {
  const def = getGameDefinition(gameId);
  if (!def) return { error: `Unknown game: ${gameId}` };

  if (!def.validateMove(state, move, playerId)) {
    return { error: "無効な手です" };
  }

  const newState = def.applyMove(state, move, playerId);
  const status = def.getStatus(newState);

  if (status === "finished") {
    const winnerId = def.getWinner(newState);
    return {
      newState,
      result: {
        winnerId,
        reason: winnerId ? "勝利" : "引き分け",
      },
    };
  }

  return { newState };
}
