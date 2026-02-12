import { useEffect } from "react";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const INJECTED_STYLES = `
@keyframes gr-bounceIn {
  0%{ transform:scale(.3); opacity:0 }
  50%{ transform:scale(1.05) }
  70%{ transform:scale(.95) }
  100%{ transform:scale(1); opacity:1 }
}
.gr-action-btn {
  transition: transform .12s, box-shadow .12s, filter .12s !important;
}
.gr-action-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,.15) !important;
  filter: brightness(1.08) !important;
}
.gr-action-btn:active:not(:disabled) {
  transform: translateY(0) !important;
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
    >
      {isWin && (
        <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>🏆</div>
      )}
      <div>
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
          >
            再戦
          </button>
        )}
        <button
          className="gr-action-btn"
          style={styles.lobbyButton}
          onClick={onLeave}
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    fontSize: "1.3rem",
    fontWeight: 800,
    margin: "0.5rem 0 1rem",
    padding: "1.25rem 2rem",
    borderRadius: "16px",
    textAlign: "center",
    fontFamily: FONT,
  },
  cardWin: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    border: "2px solid #f59e0b",
    boxShadow: "0 4px 16px rgba(245,158,11,.2)",
    color: "#92400e",
  },
  cardDefault: {
    background: "#f8fafc",
    border: "2px solid #cbd5e0",
    boxShadow: "0 4px 16px rgba(0,0,0,.08)",
    color: "#2d3748",
  },
  buttons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginTop: "1rem",
  },
  rematchButton: {
    padding: "0.7rem 2rem",
    fontSize: "1rem",
    borderRadius: "10px",
    border: "none",
    background: "#2d8a4e",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: "0 2px 6px rgba(45,138,78,.3)",
  },
  lobbyButton: {
    padding: "0.7rem 2rem",
    fontSize: "1rem",
    borderRadius: "10px",
    border: "none",
    background: "#64748b",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: "0 2px 6px rgba(100,116,139,.3)",
  },
};
