/**
 * 音速飯点（ソニックレストラン）- 型定義
 */

/**
 * カードの種類（14種類の具材 + とりけし）
 */
export type Card =
  | "ラー"
  | "メン"
  | "タン"
  | "チャー"
  | "ハン"
  | "シュー"
  | "マイ"
  | "テン"
  | "エビ"
  | "シン"
  | "サン"
  | "ミソ"
  | "シオ"
  | "とりけし";

/**
 * メニュー木構造のノード
 */
export interface MenuTreeNode {
  /** このノードのカード（rootの場合はnull） */
  card: Card | null;
  /** 子ノード（次に出せるカード） */
  children: Map<Card, MenuTreeNode>;
  /** このノードでメニューが完成するか */
  isComplete: boolean;
  /** このノードから完成可能なメニュー名のリスト */
  possibleMenus: string[];
}

/**
 * 完成したメニューの情報
 */
export interface CompletedMenu {
  /** メニュー名 */
  name: string;
  /** 完成させたカードの列 */
  cards: Card[];
  /** 完成させたプレイヤーID */
  completedBy: string;
  /** 完成時刻（タイムスタンプ） */
  timestamp: number;
}

/**
 * 音速飯点のゲーム状態
 */
export interface SonicRestaurantState {
  /** プレイヤーIDの配列 */
  playerIds: string[];

  /** プレイヤー別の手札 */
  hands: Record<string, Card[]>;

  /** 現在構築中のメニューのカード列 */
  currentPath: Card[];

  /** メニュー木構造の現在位置 */
  currentNode: MenuTreeNode;

  /** 場に出された全カードの履歴（全プレイヤー共通） */
  playedCardsHistory: Card[];

  /** 直前のターンで完成したメニュー（UIで「xx 完成！」表示用） */
  lastCompletedMenu: CompletedMenu | null;

  /** 上がった順番のプレイヤーID配列（finishedOrder[0]が1位） */
  finishedOrder: string[];

  /** ゲーム終了フラグ */
  finished: boolean;

  /** 勝者のプレイヤーID（1位） */
  winnerId: string | null;
}

/**
 * 音速飯点のプレイヤーの手
 */
export type SonicRestaurantMove = {
  type: "play-card";
  card: Card;
};

/**
 * 11種類の完成メニュー定義
 * [カード列, メニュー名]のタプル配列
 */
export const MENUS = [
  [["ラー", "メン"], "ラーメン"],
  [["チャー", "シュー", "メン"], "チャーシューメン"],
  [["タン", "メン"], "タンメン"],
  [["タン", "タン", "メン"], "タンタンメン"],
  [["チャー", "ハン"], "チャーハン"],
  [["エビ", "チャー", "ハン"], "エビチャーハン"],
  [["エビ", "シュー", "マイ"], "エビシューマイ"],
  [["ミソ", "ラー", "メン"], "ミソラーメン"],
  [["シオ", "ラー", "メン"], "シオラーメン"],
  [["テン", "シン", "ハン"], "テンシンハン"],
  [["サン", "ラー", "タン"], "サンラータン"],
] as const;

/**
 * カードの枚数定義
 */
export const CARD_COUNTS: Record<Card, number> = {
  ラー: 8,
  メン: 12,
  タン: 9,
  チャー: 5,
  ハン: 5,
  シュー: 5,
  マイ: 3,
  テン: 2,
  エビ: 2,
  シン: 2,
  サン: 2,
  ミソ: 1,
  シオ: 1,
  とりけし: 3,
};
