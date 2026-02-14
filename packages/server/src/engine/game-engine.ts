import { getGameDefinition } from "@bodobako/shared";
import type { GameResult } from "@bodobako/shared";

export function startGame(
  gameId: string,
  playerIds: string[],
  hostId?: string
): unknown {
  const def = getGameDefinition(gameId);
  if (!def) throw new Error(`Unknown game: ${gameId}`);
  if (playerIds.length < def.minPlayers || playerIds.length > def.maxPlayers) {
    throw new Error(
      `${def.name} requires ${def.minPlayers}-${def.maxPlayers} players`
    );
  }
  return def.createInitialState(playerIds, hostId);
}

export function getPlayerView(
  gameId: string,
  state: unknown,
  playerId: string
): unknown {
  const def = getGameDefinition(gameId);
  if (!def || !def.getPlayerView) return state;
  return def.getPlayerView(state, playerId);
}

export function hasPlayerView(gameId: string): boolean {
  const def = getGameDefinition(gameId);
  return !!def?.getPlayerView;
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
