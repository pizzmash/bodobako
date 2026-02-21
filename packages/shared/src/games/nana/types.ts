export interface NanaCard {
  id: number;     // 0-35 の一意インスタンスID
  number: number; // 1-12
}

/** getPlayerView で返す。number が null = このプレイヤーには非公開 */
export interface NanaCardView {
  id: number;
  number: number | null;
}

export interface NanaTurnFlip {
  cardId: number;
  source:
    | { type: "field"; index: number }
    | { type: "hand"; targetPlayerId: string; position: "max" | "min" };
}

export interface NanaState {
  playerIds: string[];
  currentPlayerIndex: number;
  /** 場札。null = 取得済みスロット（位置を保持） */
  fieldCards: (NanaCard | null)[];
  /** 各プレイヤーの手札。昇順ソート・compact（null なし） */
  hands: Record<string, NanaCard[]>;
  /** 今ターンめくったカード（最大3件） */
  turnFlips: NanaTurnFlip[];
  /** 確認待ちの結果。confirm 受信までターンを進めない */
  pendingResult: "success" | "failure" | null;
  /** 各プレイヤーが取得したセットの数字リスト */
  collectedSets: Record<string, number[]>;
  winnerId: string | null;
  finished: boolean;
}

/** getPlayerView が返す型（field/hands の card が NanaCardView に変わる） */
export interface NanaStateView
  extends Omit<NanaState, "fieldCards" | "hands"> {
  fieldCards: (NanaCardView | null)[];
  hands: Record<string, NanaCardView[]>;
}

export type NanaMove =
  | { type: "flip-field"; fieldIndex: number }
  | { type: "flip-hand"; targetPlayerId: string; position: "max" | "min" }
  | { type: "confirm" };
