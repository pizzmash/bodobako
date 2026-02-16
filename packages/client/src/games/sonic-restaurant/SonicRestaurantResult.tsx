/**
 * 音速飯店 - リザルト画面
 */

import type { RoomInfo, SonicRestaurantState } from "@bodobako/shared";
import { C } from "./constants";

interface SonicRestaurantResultProps {
  state: SonicRestaurantState;
  room: RoomInfo;
  playerId: string;
  ranking: string[];
  onRestart: () => void;
  onLeave: () => void;
}

export function SonicRestaurantResult({
  state,
  room,
  playerId,
  ranking,
  onRestart,
  onLeave,
}: SonicRestaurantResultProps) {
  // 自分の順位
  const myRank = ranking.indexOf(playerId) + 1;
  const isWinner = myRank === 1;
  const isHost = playerId === room.hostId;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "slideUp 0.4s ease-out",
        }}
      >
        {/* タイトル */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: isWinner ? C.primary : "#374151",
              margin: "0 0 0.5rem 0",
            }}
          >
            {isWinner ? "🎉 優勝！" : "ゲーム終了"}
          </h2>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: C.primary,
              margin: 0,
            }}
          >
            あなたは {myRank}位
          </p>
        </div>

        {/* 順位表 */}
        <div
          style={{
            marginBottom: "2rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {ranking.map((id, index) => {
            const player = room.players.find((p) => p.id === id);
            const handCount = state.hands[id]?.length || 0;
            const rank = index + 1;
            const isMe = id === playerId;

            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: isMe ? `${C.primary}1A` : "#f9fafb",
                  borderRadius: "0.75rem",
                  marginBottom: "0.5rem",
                  border: isMe ? `2px solid ${C.primary}` : "2px solid transparent",
                }}
              >
                {/* 順位 */}
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#6b7280",
                    minWidth: "2.5rem",
                    textAlign: "center",
                  }}
                >
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}位`}
                </div>

                {/* プレイヤー情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "#111827",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player?.name || "不明"}
                    {isMe && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.75rem",
                          color: C.primary,
                        }}
                      >
                        (あなた)
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    {handCount === 0 ? "上がり" : `残り ${handCount}枚`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ボタン */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
          }}
        >
          {isHost && (
            <button
              onClick={onRestart}
              style={{
                flex: 1,
                padding: "0.875rem",
                backgroundColor: C.primary,
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#b53333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.primary;
              }}
            >
              もう一度プレイ
            </button>
          )}
          <button
            onClick={onLeave}
            style={{
              flex: 1,
              padding: "0.875rem",
              backgroundColor: "white",
              color: "#374151",
              border: "2px solid #e5e7eb",
              borderRadius: "0.75rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            ロビーに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
