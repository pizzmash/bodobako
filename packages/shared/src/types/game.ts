export type GameStatus = "playing" | "finished";

export interface GameLogEntry {
  /** ログを生成したプレイヤーのID */
  playerId: string;
  /** 表示するメッセージ */
  message: string;
  /** タグラベル（例: "Match", "Miss"） */
  tag?: string;
  /** タグの色（CSS color文字列） */
  tagColor?: string;
  /** ゲーム固有のメタデータ（クライアント側の拡張表示用） */
  metadata?: Record<string, unknown>;
}

export interface GameDefinition<TState = unknown, TMove = unknown> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[], hostId?: string): TState;
  /** rawデータをTMove型にパース。構造が不正な場合はnullを返す。 */
  parseMove?(raw: unknown): TMove | null;
  validateMove(state: TState, move: TMove, playerId: string): boolean;
  applyMove(state: TState, move: TMove, playerId: string): TState;
  getStatus(state: TState): GameStatus;
  /** プレイヤーIDの順位リスト（1位から順）を返す。nullの場合は引き分け。 */
  getRanking(state: TState): string[] | null;
  getCurrentPlayerId(state: TState): string;
  getPlayerView?(state: TState, playerId: string): unknown;
  /**
   * 状態遷移のログエントリを生成する。
   * prevState と newState の差分からログを生成して返す。
   * クライアントはこれを蓄積して表示する。
   */
  getLogEntries?(prevState: TState, newState: TState): GameLogEntry[];
}
