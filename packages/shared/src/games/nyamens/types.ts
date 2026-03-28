export type NyaRole = "nyamens" | "assassin";
export type NyaEventCard = "okami" | "shirokuma" | "tuning";
export type NyaCard = number | NyaEventCard;

export type NyaMensPhase =
  | "role-reveal"
  | "dice-roll"
  | "card-selection"
  | "repair"
  | "event-shirokuma"
  | "event-tuning"
  | "draw-cards"
  | "vote"
  | "finished";

export interface NyaMensTrack {
  up: number[];
  down: number[];
  recycleBox: number | null;
}

export interface NyaMensState {
  phase: NyaMensPhase;
  playerOrder: string[];
  handSize: number;
  /** 全役職（秘匿: getPlayerView でフィルタ） */
  roles: Record<string, NyaRole>;
  /** 各プレイヤーの手札（秘匿: 自分のみ） */
  hands: Record<string, number[]>;
  /** ドロー山（秘匿: 枚数のみ公開） */
  drawPile: NyaCard[];
  burnedCards: number[];
  track: NyaMensTrack;
  repairDutyIndex: number;
  diceResult: number | null;
  okamiActive: boolean;
  /** 選択済みカード（秘匿: 確定前は自分のみ） */
  selectedCards: Record<string, number[]>;
  revealedCards: number[] | null;
  eventQueue: NyaEventCard[];
  readyPlayers: string[];
  shirokuma?: { targetPlayerId?: string };
  tuning?: { trackChoice?: "up" | "down"; returnedCard?: number };
  /** draw-cards フェーズ: 補充待ちプレイヤー順 */
  drawQueue?: string[];
  /** draw-cards フェーズ: 直前に引いたカード */
  drawnCard?: NyaCard | null;
  /** draw-cards フェーズ: 最後にカードを引いたプレイヤー（ACK待ち判定用） */
  lastDrawer?: string;
  eventTurnActive?: boolean;
  votes: Record<string, string | "none"> | null;
  result?: {
    winner: "nyamens" | "assassin";
    reason: "repair-complete" | "correct-arrest" | "no-assassin" | "wrong-arrest" | "missed-assassin";
  };
}

export interface NyaMensPlayerView {
  phase: NyaMensPhase;
  playerOrder: string[];
  handSize: number;
  myRole: NyaRole;
  /** 自分がアサシンなら仲間一覧、ゲーム終了後は全員に公開 */
  assassinIds: string[];
  myHand: number[];
  otherHandCounts: Record<string, number>;
  drawPileCount: number;
  burnedCards: number[];
  track: NyaMensTrack;
  repairDutyIndex: number;
  diceResult: number | null;
  okamiActive: boolean;
  mySelectedCards: number[];
  /** 全プレイヤーの選択枚数合計（匿名） */
  totalSelectedCount: number;
  /** 他プレイヤーの選択枚数（playerId → 枚数） */
  otherSelectedCounts: Record<string, number>;
  revealedCards: number[] | null;
  eventQueue: NyaEventCard[];
  readyPlayers: string[];
  shirokuma?: { targetPlayerId?: string };
  tuning?: { trackChoice?: "up" | "down"; returnedCard?: number };
  /** draw-cards フェーズ: 補充待ちプレイヤー順 */
  drawQueue: string[];
  /** 自分が引いた場合: 実際のカード / 他人が数字カードを引いた場合: null / イベントカード: 全員に公開 */
  drawnCard: NyaCard | null;
  /** draw-cards フェーズ: 最後にカードを引いたプレイヤー（ACK待ち判定用） */
  lastDrawer?: string;
  eventTurnActive?: boolean;
  votes: Record<string, string | "none"> | null;
  result?: NyaMensState["result"];
  /** ゲーム終了後のみ全役職を公開 */
  revealedRoles?: Record<string, NyaRole>;
}

export type NyaMensMove =
  | { type: "role-ready" }
  | { type: "roll-dice" }
  | { type: "select-cards"; cards: number[] }
  | { type: "confirm-submission" }
  | { type: "place-card"; card: number; destination: "up" | "down" | "recycle" }
  | { type: "shirokuma-target"; playerId: string }
  | { type: "tuning-swap"; trackChoice: "up" | "down"; replacementCard: number }
  | { type: "draw-card" }
  | { type: "vote"; target: string | "none" };
