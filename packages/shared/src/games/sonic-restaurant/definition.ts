/**
 * 音速飯点（ソニックレストラン）- GameDefinition 実装
 */

import type { GameDefinition } from "../../types/game";
import {
    buildMenuTree,
    createDeck,
    getMenuName,
    hasAnyPlayableCard,
    shuffleArray
} from "./logic";
import type {
    Card,
    CompletedMenu,
    SonicRestaurantMove,
    SonicRestaurantState,
} from "./types";

export const sonicRestaurantGame: GameDefinition<
  SonicRestaurantState,
  SonicRestaurantMove
> = {
  id: "sonic-restaurant",
  name: "音速飯点",
  description:
    "中華料理の具材カードをスピード勝負で重ねて、いち早く手札を無くせ！",
  minPlayers: 2,
  maxPlayers: 6,

  createInitialState(playerIds: string[]): SonicRestaurantState {
    // カードデッキを生成してシャッフル
    const deck = shuffleArray(createDeck());

    // 均等配布
    const hands: Record<string, Card[]> = {};
    const cardsPerPlayer = Math.floor(deck.length / playerIds.length);
    let cardIndex = 0;

    // まず各プレイヤーに均等に配布
    for (const playerId of playerIds) {
      hands[playerId] = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
      cardIndex += cardsPerPlayer;
    }

    // 余りカードがあれば、先頭プレイヤーから順番に1枚ずつ追加配布
    const remainingCards = deck.slice(cardIndex);
    for (let i = 0; i < remainingCards.length; i++) {
      const playerId = playerIds[i % playerIds.length];
      hands[playerId].push(remainingCards[i]);
    }

    // メニュー木構造を構築
    const menuTree = buildMenuTree();

    return {
      playerIds,
      hands,
      currentPath: [],
      currentNode: menuTree,
      playedCardsHistory: [],
      lastCompletedMenu: null,
      finishedOrder: [],
      finished: false,
      winnerId: null,
    };
  },

  validateMove(
    state: SonicRestaurantState,
    move: SonicRestaurantMove,
    playerId: string
  ): boolean {
    // プレイヤーがそのカードを所持しているか
    const hand = state.hands[playerId];
    if (!hand || !hand.includes(move.card)) {
      return false;
    }

    // 既に上がっているプレイヤーは手を出せない
    if (state.finishedOrder.includes(playerId)) {
      return false;
    }

    // 「とりけし」カードは常に出せる
    if (move.card === "とりけし") {
      return true;
    }

    // 通常カードは現在ノードの子として存在するか確認
    return state.currentNode.children.has(move.card);
  },

  applyMove(
    state: SonicRestaurantState,
    move: SonicRestaurantMove,
    playerId: string
  ): SonicRestaurantState {
    // 【防御的チェック】非ターン制ゲームでは、validateMove通過後に
    // 状態が変わる可能性があるため、applyMove内でも再検証
    const hand = state.hands[playerId];
    if (!hand || !hand.includes(move.card)) {
      // 不正な手の場合、状態を変更せずそのまま返す
      return state;
    }

    // 既に上がっているプレイヤーの手は無視
    if (state.finishedOrder.includes(playerId)) {
      return state;
    }

    // とりけし以外のカードは、現在ノードの子として存在するか確認
    if (move.card !== "とりけし" && !state.currentNode.children.has(move.card)) {
      // 不正な手の場合、状態を変更せずそのまま返す
      return state;
    }

    // 直前の完成メニューをリセット（新しいカードが出された時点でクリア）
    let lastCompletedMenu: CompletedMenu | null = null;

    // 出されたカードを履歴に追加
    const playedCardsHistory = [...state.playedCardsHistory, move.card];

    // 手札からカードを削除
    const newHand = hand.filter((c) => c !== move.card);
    const hands = {
      ...state.hands,
      [playerId]: newHand,
    };

    // 【とりけしカード】の処理
    if (move.card === "とりけし") {
      // currentPath が空でない場合のみルートに戻る（no-op 防止）
      if (state.currentPath.length > 0) {
        return {
          ...state,
          hands,
          playedCardsHistory,
          lastCompletedMenu,
          currentPath: [],
          currentNode: buildMenuTree(), // ルートに戻る
        };
      } else {
        // rootで「とりけし」が出された場合は何もしない（no-op）
        return {
          ...state,
          hands,
          playedCardsHistory,
          lastCompletedMenu,
        };
      }
    }

    // 【通常カード】の処理
    const nextNode = state.currentNode.children.get(move.card)!;
    const newPath = [...state.currentPath, move.card];

    // メニュー完成判定
    if (nextNode.isComplete) {
      const menuName = getMenuName(newPath);
      lastCompletedMenu = {
        name: menuName || "不明なメニュー",
        cards: newPath,
        completedBy: playerId,
        timestamp: Date.now(),
      };

      // 完成したらルートに戻る
      const rootNode = buildMenuTree();

      // 手札が0になったら上がり
      let finishedOrder = state.finishedOrder;
      if (newHand.length === 0) {
        finishedOrder = [...finishedOrder, playerId];
      }

      return {
        ...state,
        hands,
        playedCardsHistory,
        lastCompletedMenu,
        currentPath: [],
        currentNode: rootNode,
        finishedOrder,
      };
    }

    // メニュー構築中
    // 手札が0になったら上がり
    let finishedOrder = state.finishedOrder;
    if (newHand.length === 0) {
      finishedOrder = [...finishedOrder, playerId];
    }

    return {
      ...state,
      hands,
      playedCardsHistory,
      lastCompletedMenu,
      currentPath: newPath,
      currentNode: nextNode,
      finishedOrder,
    };
  },

  getStatus(state: SonicRestaurantState): "playing" | "finished" {
    if (state.finished) {
      return "finished";
    }

    // 全員上がった
    if (state.finishedOrder.length === state.playerIds.length) {
      return "finished";
    }

    // 誰も出せないカードしかない場合
    const anyoneCanPlay = state.playerIds.some((id) => {
      if (state.finishedOrder.includes(id)) return false;
      return hasAnyPlayableCard(state, id);
    });

    return anyoneCanPlay ? "playing" : "finished";
  },

  getWinner(state: SonicRestaurantState): string | null {
    // 1位のプレイヤーを返す
    return state.finishedOrder[0] ?? null;
  },

  getCurrentPlayerId(state: SonicRestaurantState): string {
    // 非ターン制のため、全員が常に行動可能（空文字を返す）
    return "";
  },

  getPlayerView(
    state: SonicRestaurantState,
    playerId: string
  ): SonicRestaurantState {
    // hands のみプレイヤー別にフィルタリング
    // 自分の手札はフル表示、他プレイヤーは枚数分の "?" 配列
    const hands: Record<string, Card[]> = {};

    for (const id of state.playerIds) {
      if (id === playerId) {
        // 自分の手札はそのまま
        hands[id] = state.hands[id];
      } else {
        // 他プレイヤーは枚数分の "?" で表現
        const handCount = state.hands[id].length;
        hands[id] = Array(handCount).fill("?" as Card);
      }
    }

    return {
      ...state,
      hands,
    };
  },
};
