/** サイコロの出目: 1〜4 または × */
export type DiceValue = 1 | 2 | 3 | 4 | "x";

/** ターンのフェーズ */
export type CiaoCiaoPhase = "rolling" | "declaring" | "challenging" | "revealing";

/** チャレンジの結果（revealing フェーズで公開） */
export interface ChallengeResult {
  challengerId: string;
  actualRoll: DiceValue;
  declaredValue: 1 | 2 | 3 | 4;
  wasLying: boolean;
  fallenPlayerId: string;
  fallenFromPosition: number;
  /** チャレンジ成功時、チャレンジャーのコマが進む歩数 */
  bonusMove: number | null;
}

export interface CiaoCiaoState {
  playerIds: string[];
  currentPlayerIndex: number;
  phase: CiaoCiaoPhase;

  /** サイコロの出目（rolling 後にセット） */
  diceRoll: DiceValue | null;
  /** 手番プレイヤーが宣言した数字 */
  declaredValue: 1 | 2 | 3 | 4 | null;
  /** 現在判断中のチャレンジャーの playerIds インデックス */
  currentChallengerIndex: number | null;
  /** チャレンジ結果（revealing で使用） */
  challengeResult: ChallengeResult | null;

  /** 各プレイヤーの橋上コマ位置。null=橋上にいない, 0=スタート, 1〜9=マス */
  bridgePositions: Record<string, number | null>;
  /** 各プレイヤーのゴール済みコマ数 */
  goals: Record<string, number>;
  /** ゴール到達順スロット（全プレイヤー共通通し番号） */
  goalSlots: { playerId: string; slot: number }[];
  /** 各プレイヤーの残りストック数 */
  stocks: Record<string, number>;

  finished: boolean;
  winnerId: string | null;
}

/**
 * getPlayerView が返す型。
 * diceRoll は手番プレイヤー本人 or revealing フェーズ時のみ公開、
 * それ以外は null にマスクされる。
 */
export interface CiaoCiaoStateView extends Omit<CiaoCiaoState, "diceRoll"> {
  diceRoll: DiceValue | null;
}

export type CiaoCiaoMove =
  | { type: "roll" }
  | { type: "declare"; value: 1 | 2 | 3 | 4 }
  | { type: "challenge"; action: "trust" | "call-liar" }
  | { type: "ack-reveal" };
