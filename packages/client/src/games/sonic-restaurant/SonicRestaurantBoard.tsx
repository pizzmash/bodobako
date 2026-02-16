/**
 * 音速飯点 - メインボードコンポーネント
 */

import { useCallback, useEffect, useState } from "react";
import type {
  Card,
  SonicRestaurantMove,
  SonicRestaurantState,
} from "@bodobako/shared";
import { useRoom } from "../../context/RoomContext";
import { AppHeader } from "../../components/AppHeader";
import { MenuSidebar } from "./MenuSidebar";
import { PlayersSidebar } from "./PlayersSidebar";
import { CenterTable } from "./CenterTable";
import { CompletedDishBanner } from "./CompletedDishBanner";
import { HandCards } from "./HandCards";
import "./sonic-restaurant.css";

export function SonicRestaurantBoard() {
  const { gameState, playerId, sendMove, room } = useRoom();

  const state = gameState as SonicRestaurantState | null;

  // 最後に出されたカードを追跡（アニメーション用）
  const [lastPlayedCard, setLastPlayedCard] = useState<Card | null>(null);

  // 型安全な送信関数
  const sendTypedMove = useCallback(
    (move: SonicRestaurantMove) => sendMove(move),
    [sendMove]
  );

  // カードプレイハンドラ
  const handleCardPlay = useCallback(
    (card: Card) => {
      if (!state || !playerId) return;

      // カードを出す
      sendTypedMove({ type: "play-card", card });

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ヘッダー */}
      <AppHeader />

      {/* メインエリア */}
      <main
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* 左サイドバー: お品書き */}
        <MenuSidebar state={state} />

        {/* 中央エリア: 回転テーブル */}
        <div style={{ position: "relative", flex: 1 }}>
          {/* 完成バナー */}
          <CompletedDishBanner dishName={state.lastCompletedMenu?.name || null} />

          <CenterTable state={state} lastPlayedCard={lastPlayedCard} />
        </div>

        {/* 右サイドバー: 他プレイヤー */}
        <PlayersSidebar state={state} playerId={playerId} room={room} />
      </main>

      {/* 下部: 自分の手札 */}
      <HandCards state={state} playerId={playerId} onCardPlay={handleCardPlay} />
    </div>
  );
}
