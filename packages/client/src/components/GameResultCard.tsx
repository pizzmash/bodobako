import type { Player } from "@bodobako/shared";
import { useState } from "react";
import { RematchConfirmModal } from "./RematchConfirmModal";

const TrophyIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9C6 10.5913 6.63214 12.1174 7.75736 13.2426C8.88258 14.3679 10.4087 15 12 15C13.5913 15 15.1174 14.3679 16.2426 13.2426C17.3679 12.1174 18 10.5913 18 9V4H6V9Z" fill="url(#trophy-gradient)" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V7C2 7.53043 2.21071 8.03914 2.58579 8.41421C2.96086 8.78929 3.46957 9 4 9H6" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 4H20C20.5304 4 21.0391 4.21071 21.4142 4.58579C21.7893 4.96086 22 5.46957 22 6V7C22 7.53043 21.7893 8.03914 21.4142 8.41421C21.0391 8.78929 20.5304 9 20 9H18" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V19M8 22H16" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="trophy-gradient" x1="6" y1="4" x2="18" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFD700"/>
        <stop offset="1" stopColor="#FFA500"/>
      </linearGradient>
    </defs>
  </svg>
);

interface GameResultCardProps {
  result: "win" | "lose" | "draw";
  winnerName?: string;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
  playerId?: string;
  rematchRequests?: string[];
  resultPlayers?: Player[];
  /** ゲームの最小プレイ人数（GameDefinition.minPlayers）。省略時は 2 */
  minPlayers?: number;
  onRematchRequest?: () => void;
}

export function GameResultCard({
  result,
  winnerName,
  isHost,
  onRematch,
  onLeave,
  playerId,
  rematchRequests,
  resultPlayers,
  minPlayers = 2,
  onRematchRequest,
}: GameResultCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isWin = result === "win";
  const isDraw = result === "draw";
  const hasRequested = playerId ? (rematchRequests ?? []).includes(playerId) : false;

  const handleRematchClick = () => {
    onRematchRequest?.();
    setIsModalOpen(true);
  };
  const handleConfirm = () => {
    setIsModalOpen(false);
    onRematch();
  };
  const cardClass = isWin
    ? "bg-result-win border-indigo-300/40 shadow-card-indigo-strong text-indigo-600"
    : "bg-slate-50/85 border-indigo-300/20 shadow-card-indigo text-indigo-900";
  const primaryButtonClass =
    "min-h-[48px] min-w-[120px] whitespace-nowrap rounded-2xl px-7 py-3.5 font-poppins text-base font-semibold text-white transition duration-200 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-0";

  return (
    <div
      className={`my-2 mb-4 flex flex-col items-center gap-4 rounded-3xl border-2 px-10 py-8 text-center backdrop-blur-xl animate-bounce-in ${cardClass}`}
      role="status"
      aria-live="polite"
    >
      {isWin && (
        <div className="mb-2 animate-icon-float drop-shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
          <TrophyIcon />
        </div>
      )}
      <div className="text-2xl font-bold font-poppins tracking-tight">
        {isWin
          ? "あなたの勝ちです！"
          : isDraw
            ? "引き分けです"
            : `${winnerName ?? "相手"} の勝ちです`}
      </div>
      <div className="flex gap-3 justify-center">
        {isHost ? (
          onRematchRequest ? (
            <button
              className={`${primaryButtonClass} border-0 bg-green-gradient shadow-action-green hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)]`}
              onClick={handleRematchClick}
              aria-label="再戦する"
            >
              再戦
            </button>
          ) : (
            <button
              className={`${primaryButtonClass} border-0 bg-green-gradient shadow-action-green hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)]`}
              onClick={onRematch}
              aria-label="再戦する"
            >
              再戦
            </button>
          )
        ) : (
          hasRequested ? (
            <div className={`${primaryButtonClass} flex items-center justify-center border-0 bg-green-300 cursor-default select-none`}>
              ホスト待ち...
            </div>
          ) : onRematchRequest ? (
            <button
              className={`${primaryButtonClass} border-0 bg-green-gradient shadow-action-green hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)]`}
              onClick={onRematchRequest}
              aria-label="再戦を希望する"
            >
              再戦を希望する
            </button>
          ) : (
            <div className={`${primaryButtonClass} flex items-center justify-center border-0 bg-green-300 cursor-default select-none`}>
              ホスト待ち...
            </div>
          )
        )}
        <button
          className={`${primaryButtonClass} border-0 bg-indigo-gradient shadow-action-indigo hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)]`}
          onClick={onLeave}
          aria-label="ロビーに戻る"
        >
          ロビーに戻る
        </button>
      </div>
      {isModalOpen && (
        <RematchConfirmModal
          rematchRequests={rematchRequests ?? []}
          allPlayers={resultPlayers ?? []}
          playerId={playerId ?? null}
          minPlayers={minPlayers}
          onConfirm={handleConfirm}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
