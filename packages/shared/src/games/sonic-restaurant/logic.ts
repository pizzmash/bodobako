/**
 * 音速飯点（ソニックレストラン）- ゲームロジック
 */

import type { Card, MenuTreeNode, SonicRestaurantState } from "./types.js";
import { CARD_COUNTS, MENUS } from "./types.js";

/**
 * メニュー木構造を構築する
 * 12種類のメニューから木構造を生成し、各ノードで完成可能なメニュー名を計算
 */
export function buildMenuTree(): MenuTreeNode {
  const root: MenuTreeNode = {
    card: null,
    children: new Map(),
    isComplete: false,
    possibleMenus: [],
  };

  // 各メニューを木に登録
  for (const [cards, menuName] of MENUS) {
    let node = root;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as Card;
      
      if (!node.children.has(card)) {
        node.children.set(card, {
          card,
          children: new Map(),
          isComplete: false,
          possibleMenus: [],
        });
      }
      
      node = node.children.get(card)!;
      
      // 最後のカードに到達したらメニュー完成
      if (i === cards.length - 1) {
        node.isComplete = true;
        // 完成ノードには直接メニュー名を設定
        if (!node.possibleMenus.includes(menuName)) {
          node.possibleMenus.push(menuName);
        }
      }
    }
  }

  // 各ノードの possibleMenus を計算（親から子へ伝播）
  calculatePossibleMenus(root);

  return root;
}

/**
 * 各ノードから完成可能なメニュー名を再帰的に計算
 */
function calculatePossibleMenus(node: MenuTreeNode): string[] {
  const menus: string[] = [];

  // このノードで完成する場合、そのメニュー名を追加
  if (node.isComplete) {
    menus.push(...node.possibleMenus);
  }

  // 子ノードから完成可能なメニュー名を収集
  for (const child of node.children.values()) {
    menus.push(...calculatePossibleMenus(child));
  }

  // 重複削除してノードに設定
  node.possibleMenus = [...new Set(menus)];
  return menus;
}

/**
 * 配列が等しいか比較
 */
function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

/**
 * 60枚のカードデッキを生成
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const [card, count] of Object.entries(CARD_COUNTS)) {
    for (let i = 0; i < count; i++) {
      deck.push(card as Card);
    }
  }
  
  return deck;
}

/**
 * Fisher-Yates アルゴリズムで配列をシャッフル
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 指定カードが現在の場の状態で出せるか判定
 */
export function canPlayCard(state: SonicRestaurantState, card: Card): boolean {
  // 「とりけし」カードは常に出せる
  if (card === "とりけし") {
    return true;
  }

  // 通常カードは現在ノードの子として存在するか確認
  // JSONシリアライズ後の復元時にMapがオブジェクトになる場合があるため両方に対応
  const children = state.currentNode.children;
  if (children instanceof Map) {
    return children.has(card);
  } else {
    // プレーンオブジェクトの場合
    return card in children;
  }
}

/**
 * プレイヤーが出せるカードを1枚でも持っているか確認
 */
export function hasAnyPlayableCard(
  state: SonicRestaurantState,
  playerId: string
): boolean {
  const hand = state.hands[playerId];
  if (!hand) return false;

  return hand.some((card) => canPlayCard(state, card));
}

/**
 * カードパスからメニュー名を取得
 */
export function getMenuName(cards: Card[]): string | null {
  for (const [menuCards, menuName] of MENUS) {
    if (arraysEqual(cards, menuCards as readonly Card[])) {
      return menuName;
    }
  }
  return null;
}
