/**
 * 汎用ゲームリザルト画面（順位表示付き）
 * SonicRestaurantResult から切り出した汎用コンポーネント。
 * renderPlayerDetail でゲーム固有の詳細行を差し込む。
 */

import type { RoomInfo } from "@bodobako/shared";
import type { ReactNode } from "react";
import { useState } from "react";
import { PartyPopper, Trophy } from "lucide-react";
import { Z } from "../styles/tokens";
import { RematchConfirmModal } from "./RematchConfirmModal";

const RANK_COLOR: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

interface GameRankingResultProps {
  ranking: string[];
  room: RoomInfo;
  playerId: string;
  /** ハイライトカラー（デフォルト: "#ef4444"） */
  accentColor?: string;
  /** プレイヤーリストの上書き（リザルト画面でスナップショットを使う場合） */
  players?: RoomInfo["players"];
  /** プレイヤーごとの詳細行（ゲーム固有の情報） */
  renderPlayerDetail: (playerId: string) => ReactNode;
  onRestart: () => void;
  onLeave: () => void;
  rematchRequests?: string[];
  /** ゲームの最小プレイ人数（GameDefinition.minPlayers）。省略時は 2 */
  minPlayers?: number;
  onRematchRequest?: () => void;
}

export function GameRankingResult({
  ranking,
  room,
  playerId,
  accentColor = "#ef4444",
  players,
  renderPlayerDetail,
  onRestart,
  onLeave,
  rematchRequests,
  minPlayers = 2,
  onRematchRequest,
}: GameRankingResultProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const myRank = ranking.indexOf(playerId) + 1;
  const isWinner = myRank === 1;
  const isHost = playerId === room.hostId;
  const displayPlayers = players ?? room.players;
  const hasRequested = (rematchRequests ?? []).includes(playerId);

  const handleRematchClick = () => {
    onRematchRequest?.();
    setIsModalOpen(true);
  };
  const handleConfirm = () => {
    setIsModalOpen(false);
    onRestart();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in" style={{ zIndex: Z.overlay, paddingRight: "var(--sidebar-right-offset, 0px)" }}>
      <div className="bg-white rounded-3xl p-8 max-w-[500px] w-[90%] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-down">
        {/* タイトル */}
        <div className="text-center mb-8">
          <h2
            className="text-4xl font-extrabold m-0 mb-2"
            style={{ color: isWinner ? accentColor : "#374151" }}
          >
            {isWinner ? <><PartyPopper size={32} className="inline mr-2" />優勝！</> : "ゲーム終了"}
          </h2>
          <p className="text-xl font-bold m-0" style={{ color: accentColor }}>
            あなたは {myRank}位
          </p>
        </div>

        {/* 順位表 */}
        <div className="mb-8 max-h-[300px] overflow-y-auto">
          {ranking.map((id, index) => {
            const player = displayPlayers.find((p) => p.id === id);
            const rank = index + 1;
            const isMe = id === playerId;

            return (
              <div
                key={id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl mb-2"
                style={{
                  backgroundColor: isMe ? `${accentColor}1A` : "#f9fafb",
                  border: isMe ? `2px solid ${accentColor}` : "2px solid transparent",
                }}
              >
                {/* 順位 */}
                <div
                  className="text-2xl font-extrabold min-w-[2.5rem] text-center"
                  style={{
                    color: RANK_COLOR[rank] ?? "#6b7280",
                  }}
                >
                  {rank <= 3 ? (
                    <Trophy size={24} color={RANK_COLOR[rank]} />
                  ) : (
                    `${rank}位`
                  )}
                </div>

                {/* プレイヤー情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-900 m-0 truncate">
                    {player?.name || "不明"}
                    {isMe && (
                      <span className="ml-2 text-xs" style={{ color: accentColor }}>
                        (あなた)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 m-0">{renderPlayerDetail(id)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          {isHost ? (
            onRematchRequest ? (
              <button
                onClick={handleRematchClick}
                className="flex-1 py-3.5 text-white border-0 rounded-xl text-base font-bold cursor-pointer transition-opacity hover:opacity-85"
                style={{ backgroundColor: accentColor }}
              >
                もう一度プレイ
              </button>
            ) : (
              <button
                onClick={onRestart}
                className="flex-1 py-3.5 text-white border-0 rounded-xl text-base font-bold cursor-pointer transition-opacity hover:opacity-85"
                style={{ backgroundColor: accentColor }}
              >
                もう一度プレイ
              </button>
            )
          ) : (
            hasRequested ? (
              <div
                className="flex-1 py-3.5 rounded-xl text-base font-bold border-2 text-center select-none"
                style={{ color: accentColor, borderColor: `${accentColor}55`, backgroundColor: `${accentColor}15` }}
              >
                ホスト待ち...
              </div>
            ) : onRematchRequest ? (
              <button
                onClick={onRematchRequest}
                className="flex-1 py-3.5 text-white border-0 rounded-xl text-base font-bold cursor-pointer transition-opacity hover:opacity-85"
                style={{ backgroundColor: accentColor }}
              >
                再戦を希望する
              </button>
            ) : (
              <div
                className="flex-1 py-3.5 rounded-xl text-base font-bold border-2 text-center select-none"
                style={{ color: accentColor, borderColor: `${accentColor}55`, backgroundColor: `${accentColor}15` }}
              >
                ホスト待ち...
              </div>
            )
          )}
          <button
            onClick={onLeave}
            className="flex-1 py-3.5 bg-white text-gray-700 border-2 border-gray-200 rounded-xl text-base font-bold cursor-pointer hover:bg-gray-50 transition-colors"
          >
            ロビーに戻る
          </button>
        </div>
        {isModalOpen && (
          <RematchConfirmModal
            rematchRequests={rematchRequests ?? []}
            allPlayers={displayPlayers}
            playerId={playerId}
            minPlayers={minPlayers}
            onConfirm={handleConfirm}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
