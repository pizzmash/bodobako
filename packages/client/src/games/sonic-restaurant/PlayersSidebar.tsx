/**
 * プレイヤーサイドバー（他プレイヤー情報）
 */

import type { RoomInfo, SonicRestaurantState } from "@bodobako/shared";
import React from "react";
import { Z } from "../../styles/tokens";
import { LAYOUT, styles } from "./constants";

interface PlayersSidebarProps {
  state: SonicRestaurantState;
  playerId: string;
  room: RoomInfo;
}

export const PlayersSidebar = React.memo(function PlayersSidebar({
  state,
  playerId,
  room,
}: PlayersSidebarProps) {
  // 他プレイヤーのリスト（自分以外）
  const otherPlayers = room.players.filter((p) => p.id !== playerId);

  // 初期手札枚数を計算（60枚のデッキをプレイヤー数で割る）
  const initialHandSize = Math.ceil(60 / state.playerIds.length);

  return (
    <aside
      className="h-full min-h-0 flex flex-col shadow-lg"
      style={{
        width: LAYOUT.sidebarWidth,
        backgroundColor: "#ffffff",
        padding: "1rem 0.375rem 0.5rem",
        zIndex: Z.srGameSidebar,
      }}
    >
      {/* ヘッダー */}
      <div style={styles.menuHeader}>
        <span style={{ fontSize: "0.875rem" }}>👥</span>
        <h2 style={styles.menuTitle}>シェフ</h2>
      </div>

      {/* プレイヤーリスト */}
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto min-h-0 pr-0.5">
        {otherPlayers.map((player) => {
          const handCount = state.hands[player.id]?.length || 0;
          const isFinished = state.finishedOrder.includes(player.id);
          const progressWidth = initialHandSize > 0 ? (handCount / initialHandSize) * 100 : 0;

          return (
            <div key={player.id} style={styles.playerItem}>
              {/* プログレスバー背景 */}
              <div
                style={{
                  ...styles.playerProgress,
                  width: `${progressWidth}%`,
                }}
              />

              {/* プレイヤー情報 */}
              <div className="flex-1 min-w-0 relative" style={{ zIndex: Z.srPlayerInfo }}>
                <p style={styles.playerName}>{player.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  {isFinished ? (
                    <span
                      style={{
                        ...styles.badge,
                        ...styles.badgeActive,
                        animation: "none",
                      }}
                    >
                      上がり
                    </span>
                  ) : (
                    <span style={styles.playerCards}>残り {handCount}枚</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
