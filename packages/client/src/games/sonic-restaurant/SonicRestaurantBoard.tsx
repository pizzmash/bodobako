/**
 * 音速飯点 - メインボードコンポーネント
 */

import type {
    Card,
    MenuTreeNode,
    SonicRestaurantMove,
} from "@bodobako/shared";
import { buildMenuTree } from "@bodobako/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoom } from "../../context/RoomContext";
import { CenterTable } from "./CenterTable";
import { CompletedDishBanner } from "./CompletedDishBanner";
import { LAYOUT } from "./constants";
import { HandCards } from "./HandCards";
import { MenuSidebar } from "./MenuSidebar";
import { OrderStartCountdown } from "./OrderStartCountdown";
import { PlayersSidebar } from "./PlayersSidebar";
import { SonicRestaurantResult } from "./SonicRestaurantResult";
export function SonicRestaurantBoard() {
  const { gameState, playerId, sendMove, room, gameResult, startGame, leaveRoom } = useRoom();
  const rawState = gameState?.gameId === "sonic-restaurant" ? gameState.state : null;

  // Socket.IOでシリアライズされたMapを復元
  const state = useMemo(() => {
    if (!rawState) return null;

    // buildMenuTree()でルートを取得し、currentPathをたどって現在ノードを復元
    const menuTree = buildMenuTree();
    let currentNode: MenuTreeNode = menuTree;

    for (const card of rawState.currentPath) {
      const children = currentNode.children;
      const nextNode = children instanceof Map
        ? children.get(card)
        : (children as Record<string, MenuTreeNode>)[card];
      if (!nextNode) break;
      currentNode = nextNode;
    }

    return {
      ...rawState,
      currentNode,
    };
  }, [rawState]);

  // 最後に出されたカードを追跡（アニメーション用）
  const [lastPlayedCard, setLastPlayedCard] = useState<Card | null>(null);
  const lastPlayedCardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lastPlayedCardTimerRef.current) clearTimeout(lastPlayedCardTimerRef.current);
    };
  }, []);

  // 型安全な送信関数
  const sendTypedMove = useCallback(
    (move: SonicRestaurantMove) => sendMove(move),
    [sendMove]
  );

  // カウントダウン完了ハンドラ
  const handleCountdownComplete = useCallback(() => {
    // サーバーにカウントダウン完了を通知
    sendTypedMove({ type: "countdown-complete" });
  }, [sendTypedMove]);

  // カードプレイハンドラ
  const handleCardPlay = useCallback(
    (card: Card, handIndex: number) => {
      if (!state || !playerId) return;

      // カードを出す
      sendTypedMove({ type: "play-card", card, handIndex });

      // アニメーション用に記録
      setLastPlayedCard(card);

      // 800ms後にリセット
      if (lastPlayedCardTimerRef.current) clearTimeout(lastPlayedCardTimerRef.current);
      lastPlayedCardTimerRef.current = setTimeout(() => {
        setLastPlayedCard(null);
      }, 800);
    },
    [state, playerId, sendTypedMove]
  );

  if (gameState !== null && gameState.gameId !== "sonic-restaurant") return null;
  // ゲーム状態がnullの場合の処理
  if (!state || !playerId || !room) {
    return (
      <div className="flex items-center justify-center h-screen text-xl text-gray-500">
        ゲームを読み込み中...
      </div>
    );
  }

  const isCountdown = state.phase === "countdown";

  return (
    <>
      {/* カウントダウン */}
      {isCountdown && <OrderStartCountdown onComplete={handleCountdownComplete} />}

      {/* リザルト画面 */}
      {gameResult && gameResult.ranking && (
        <SonicRestaurantResult
          state={state}
          room={room}
          playerId={playerId}
          ranking={gameResult.ranking}
          onRestart={startGame}
          onLeave={leaveRoom}
        />
      )}

      {/* メインエリア */}
      {/* top: 76px = AppHeaderの高さ分（padding 14px×2 + pill minHeight 32px + padding 6px×2 + border 1px + margin） */}
      <main
        className="fixed left-0 right-0 flex transition-opacity duration-300"
        style={{
          top: "76px",
          bottom: `${LAYOUT.handHeight}px`,
          pointerEvents: isCountdown ? "none" : "auto",
          opacity: isCountdown ? 0.6 : 1,
        }}
      >
        {/* 左サイドバー: お品書き */}
        <MenuSidebar state={state} />

        {/* 中央エリア: 回転テーブル */}
        <div className="relative flex-1 flex flex-col">
          {/* 完成バナー */}
          <CompletedDishBanner dishName={state.lastCompletedMenu?.name || null} />
          <CenterTable state={state} lastPlayedCard={lastPlayedCard} />
        </div>

        {/* 右サイドバー: 他プレイヤー */}
        <PlayersSidebar state={state} playerId={playerId} room={room} />
      </main>

      {/* 下部: 自分の手札 */}
      <div
        className="transition-opacity duration-300"
        style={{
          pointerEvents: isCountdown ? "none" : "auto",
          opacity: isCountdown ? 0.6 : 1,
        }}
      >
        <HandCards state={state} playerId={playerId} onCardPlay={handleCardPlay} />
      </div>
    </>
  );
}
