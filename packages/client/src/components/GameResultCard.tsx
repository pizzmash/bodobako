import { useEffect } from "react";

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const BODY_FONT = "'Inter', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* SVGトロフィーアイコン */
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

const INJECTED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Poppins:wght@600;700;800&display=swap');

@keyframes gr-bounceIn {
  0%{ transform:scale(.3); opacity:0 }
  50%{ transform:scale(1.05) }
  70%{ transform:scale(.95) }
  100%{ transform:scale(1); opacity:1 }
}

@keyframes gr-iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@media (prefers-reduced-motion: reduce) {
  .gr-action-btn, .gr-icon {
    animation: none !important;
    transition: none !important;
  }
}

.gr-action-btn {
  transition: all .2s ease !important;
}
.gr-action-btn:hover:not(:disabled) {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35) !important;
}
.gr-action-btn:active:not(:disabled) {
  transform: translateY(0) !important;
}
.gr-action-btn:focus {
  outline: 3px solid #6366F1 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
}

.gr-icon {
  animation: gr-iconFloat 3s ease-in-out infinite;
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "gr-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = INJECTED_STYLES;
    document.head.appendChild(tag);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}

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
  useInjectStyles();

  const isWin = result === "win";
  const isDraw = result === "draw";

  return (
    <div
      style={{
        ...styles.card,
        ...(isWin ? styles.cardWin : styles.cardDefault),
        animation: "gr-bounceIn .6s ease-out",
      }}
      role="status"
      aria-live="polite"
    >
      {isWin && (
        <div className="gr-icon" style={styles.iconWrapper}>
          <TrophyIcon />
        </div>
      )}
      <div style={styles.resultText}>
        {isWin
          ? "あなたの勝ちです！"
          : isDraw
            ? "引き分けです"
            : `${winnerName ?? "相手"} の勝ちです`}
      </div>
      <div style={styles.buttons}>
        {isHost && (
          <button
            className="gr-action-btn"
            style={styles.rematchButton}
            onClick={onRematch}
            aria-label="再戦する"
          >
            再戦
          </button>
        )}
        <button
          className="gr-action-btn"
          style={styles.lobbyButton}
          onClick={onLeave}
          aria-label="ロビーに戻る"
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    margin: "0.5rem 0 1rem",
    padding: "2rem 2.5rem 1.75rem",
    borderRadius: "24px",
    textAlign: "center",
    fontFamily: BODY_FONT,
    backdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  cardWin: {
    background: "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(129, 140, 248, 0.1) 50%, rgba(250, 245, 255, 0.95) 100%)",
    border: "2px solid rgba(129, 140, 248, 0.4)",
    boxShadow: "0 12px 32px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3) inset",
    color: "#4F46E5",
  },
  cardDefault: {
    background: "rgba(248, 250, 252, 0.85)",
    backdropFilter: "blur(16px)",
    border: "2px solid rgba(129, 140, 248, 0.2)",
    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
    color: "#312E81",
  },
  iconWrapper: {
    marginBottom: "0.5rem",
    filter: "drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3))",
  },
  resultText: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontFamily: FONT,
    letterSpacing: "-0.01em",
  },
  buttons: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    marginTop: "0.5rem",
    width: "100%",
    flexWrap: "nowrap",
    alignItems: "center",
  },
  rematchButton: {
    padding: "0.875rem 1.75rem",
    fontSize: "1rem",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
    minHeight: "48px",
    whiteSpace: "nowrap",
    minWidth: "120px",
  },
  lobbyButton: {
    padding: "0.875rem 1.75rem",
    fontSize: "1rem",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
    minHeight: "48px",
    whiteSpace: "nowrap",
    minWidth: "120px",
  },
};
