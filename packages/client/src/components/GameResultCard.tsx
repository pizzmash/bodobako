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
}

export function GameResultCard({
  result,
  winnerName,
  isHost,
  onRematch,
  onLeave,
}: GameResultCardProps) {
  const isWin = result === "win";
  const isDraw = result === "draw";

  return (
    <div
      className="my-2 mb-4 px-10 py-8 rounded-3xl text-center flex flex-col items-center gap-4 backdrop-blur-xl animate-bounce-in"
      style={
        isWin
          ? {
              background:
                "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(129,140,248,0.1) 50%, rgba(250,245,255,0.95) 100%)",
              border: "2px solid rgba(129,140,248,0.4)",
              boxShadow:
                "0 12px 32px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.3) inset",
              color: "#4F46E5",
            }
          : {
              background: "rgba(248,250,252,0.85)",
              border: "2px solid rgba(129,140,248,0.2)",
              boxShadow:
                "0 8px 24px rgba(99,102,241,0.15), 0 0 0 1px rgba(255,255,255,0.2) inset",
              color: "#312E81",
            }
      }
      role="status"
      aria-live="polite"
    >
      {isWin && (
        <div
          className="mb-2 animate-icon-float"
          style={{ filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.3))" }}
        >
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
      <div className="flex gap-3 justify-center mt-2 w-full flex-nowrap items-center">
        {isHost && (
          <button
            className="gr-action-btn px-7 py-3.5 text-base rounded-2xl font-semibold font-poppins text-white cursor-pointer whitespace-nowrap min-h-[48px] min-w-[120px]"
            style={{
              background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
              boxShadow:
                "0 4px 12px rgba(34,197,94,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset",
              border: "none",
            }}
            onClick={onRematch}
            aria-label="再戦する"
          >
            再戦
          </button>
        )}
        <button
          className="gr-action-btn px-7 py-3.5 text-base rounded-2xl font-semibold font-poppins text-white cursor-pointer whitespace-nowrap min-h-[48px] min-w-[120px] bg-indigo-gradient"
          style={{
            boxShadow:
              "0 4px 12px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset",
            border: "none",
          }}
          onClick={onLeave}
          aria-label="ロビーに戻る"
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}
