/**
 * 音速飯点 - メインボードコンポーネント
 */

import type {
  Card,
  MenuTreeNode,
  SonicRestaurantMove,
  SonicRestaurantState,
} from "@bodobako/shared";
import { buildMenuTree } from "@bodobako/shared";
import { useCallback, useMemo, useState } from "react";
import { useRoom } from "../../context/RoomContext";
import { CenterTable } from "./CenterTable";
import { CompletedDishBanner } from "./CompletedDishBanner";
import { HandCards } from "./HandCards";
import { MenuSidebar } from "./MenuSidebar";
import { OrderStartCountdown } from "./OrderStartCountdown";
import { PlayersSidebar } from "./PlayersSidebar";
import { SonicRestaurantResult } from "./SonicRestaurantResult";
import "./sonic-restaurant.css";

export function SonicRestaurantBoard() {
  const { gameState, playerId, sendMove, room, gameResult, startGame, leaveRoom } = useRoom();

  const rawState = gameState as SonicRestaurantState | null;

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
        : (children as any)[card];
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
      setTimeout(() => {
        setLastPlayedCard(null);
      }, 800);
    },
    [state, playerId, sendTypedMove]
  );

  // ゲーム状態がnullの場合の処理
  if (!state || !playerId || !room) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "1.25rem",
          color: "#666",
        }}
      >
        ゲームを読み込み中...
      </div>
    );
  }

  return (
    <>
      {/* カウントダウン */}
      {state.phase === "countdown" && <OrderStartCountdown onComplete={handleCountdownComplete} />}

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
      <main
        style={{
          position: "fixed",
          top: "49px", // AppHeaderの高さ分
          left: 0,
          right: 0,
          bottom: "176px", // 手札エリアの高さ分を除く
          display: "flex",
          pointerEvents: state.phase === "countdown" ? "none" : "auto",
          opacity: state.phase === "countdown" ? 0.6 : 1,
          transition: "opacity 0.3s",
        }}
      >
        {/* 左サイドバー: お品書き */}
        <MenuSidebar state={state} />

        {/* 中央エリア: 回転テーブル */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* 完成バナー */}
          <CompletedDishBanner dishName={state.lastCompletedMenu?.name || null} />

          <CenterTable state={state} lastPlayedCard={lastPlayedCard} />
        </div>

        {/* 右サイドバー: 他プレイヤー */}
        <PlayersSidebar state={state} playerId={playerId} room={room} />
      </main>

      {/* 下部: 自分の手札 */}
      <div
        style={{
          pointerEvents: state.phase === "countdown" ? "none" : "auto",
          opacity: state.phase === "countdown" ? 0.6 : 1,
          transition: "opacity 0.3s",
        }}
      >
        <HandCards state={state} playerId={playerId} onCardPlay={handleCardPlay} />
      </div>
    </>
  );
}
