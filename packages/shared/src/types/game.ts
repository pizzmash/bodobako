export type GameStatus = "playing" | "finished";

export interface GameDefinition<TState = unknown, TMove = unknown> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[]): TState;
  validateMove(state: TState, move: TMove, playerId: string): boolean;
  applyMove(state: TState, move: TMove, playerId: string): TState;
  getStatus(state: TState): GameStatus;
  getWinner(state: TState): string | null;
  getCurrentPlayerId(state: TState): string;
}
