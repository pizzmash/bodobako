/**
 * プレイヤーサイドバー（他プレイヤー情報）
 */

import type { RoomInfo, SonicRestaurantState } from "@bodobako/shared";
import { styles } from "./constants";

interface PlayersSidebarProps {
  state: SonicRestaurantState;
  playerId: string;
  room: RoomInfo;
}

export function PlayersSidebar({
  state,
  playerId,
  room,
}: PlayersSidebarProps) {
  // 他プレイヤーのリスト（自分以外）
  const otherPlayers = room.players.filter((p) => p.id !== playerId);

  // 初期手札枚数を計算（60枚のデッキをプレイヤー数で割る）
  const initialHandSize = Math.ceil(60 / state.playerIds.length);

  return (
    <aside style={styles.sidebar}>
      {/* ヘッダー */}
      <div style={styles.menuHeader}>
        <span style={{ fontSize: "0.875rem" }}>👥</span>
        <h2 style={styles.menuTitle}>シェフ</h2>
      </div>

      {/* プレイヤーリスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, overflowY: "auto", minHeight: 0, paddingRight: "0.125rem" }}>
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
              <div style={styles.playerInfo}>
                <p style={styles.playerName}>{player.name}</p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    marginTop: "0.25rem",
                  }}
                >
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
}
