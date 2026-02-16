export type GameStatus = "playing" | "finished";

export interface GameDefinition<TState = unknown, TMove = unknown> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[], hostId?: string): TState;
  validateMove(state: TState, move: TMove, playerId: string): boolean;
  applyMove(state: TState, move: TMove, playerId: string): TState;
  getStatus(state: TState): GameStatus;
  /** プレイヤーIDの順位リスト（1位から順）を返す。nullの場合は引き分け。 */
  getRanking(state: TState): string[] | null;
  getCurrentPlayerId(state: TState): string;
  getPlayerView?(state: TState, playerId: string): unknown;
}
