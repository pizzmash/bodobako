import { useEffect, useState, useRef } from "react";
import { useRoom } from "../context/RoomContext";
import { getGameDefinition } from "@bodobako/shared";

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* SVGアイコンコンポーネント */
const GameIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const INJECTED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

@keyframes header-slideDown {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes header-pillIn {
  from { opacity: 0; transform: scale(.9); }
  to   { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .app-header-brand, .app-header-name, .app-header-inner {
    animation: none !important;
    transition: none !important;
  }
}

.app-header-brand {
  transition: opacity .2s ease;
}
.app-header-brand:hover {
  opacity: .75;
}
.app-header-name {
  transition: background .2s ease, transform .15s ease;
}
.app-header-name:hover {
  background: rgba(129, 140, 248, 0.15) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}
.app-header-name:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

@media (max-width: 640px) {
  .app-header-inner {
    flex-wrap: wrap;
    justify-content: center !important;
    gap: 8px !important;
    padding: 10px 16px !important;
  }
  .app-header-right {
    justify-content: center;
    width: 100%;
  }
  .app-header-brand {
    width: 100%;
    justify-content: center;
  }
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "app-header-styles";
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

export function AppHeader() {
  useInjectStyles();
  const { room, playerId, playerName, setPlayerName } = useRoom();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const inputRef = useRef<HTMLInputElement>(null);

  const gameDef = room ? getGameDefinition(room.gameId) : null;
  const myPlayer = room?.players.find((p) => p.id === playerId);
  const displayName = myPlayer?.name ?? playerName;

  const startEdit = () => {
    if (room) return; // ルーム中は変更不可
    setDraft(playerName);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) setPlayerName(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <header style={styles.header}>
      <div className="app-header-inner" style={styles.inner}>
        {/* Brand */}
        <div 
          className="app-header-brand" 
          style={styles.brand}
          role="heading"
          aria-level={1}
        >
          <GameIcon />
          <span style={styles.brandText}>ボド箱</span>
        </div>

        {/* Right side */}
        <div className="app-header-right" style={styles.right}>
          {/* Room context pills */}
          {room && (
            <div style={styles.context}>
              {gameDef && (
                <span style={styles.gamePill}>{gameDef.name}</span>
              )}
              <span style={styles.codePill}>
                <span style={styles.codePillLabel}>ROOM</span>
                {room.code}
              </span>
            </div>
          )}

          {/* Player name pill (always visible when name is set) */}
          {playerName && !editing && (
            <button
              className={room ? "" : "app-header-name"}
              style={{
                ...styles.playerPill,
                cursor: room ? "default" : "pointer",
                border: "none",
                background: styles.playerPill.background,
              }}
              onClick={startEdit}
              disabled={!!room}
              title={room ? displayName : "クリックで名前を変更"}
              aria-label={room ? `プレイヤー: ${displayName}` : `名前を変更: ${displayName}`}
            >
              <span style={styles.playerDot} aria-hidden="true" />
              {displayName}
              {!room && <span style={styles.editHint} aria-hidden="true">✎</span>}
            </button>
          )}

          {/* Inline edit */}
          {editing && (
            <input
              ref={inputRef}
              style={styles.editInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              maxLength={12}
              aria-label="プレイヤー名編集"
              type="text"
            />
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 900,
    width: "100%",
    background: "rgba(255, 255, 255, 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(129, 140, 248, 0.2)",
    animation: "header-slideDown .4s ease",
    fontFamily: FONT,
    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.08)",
  },
  inner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 800,
    margin: "0 auto",
    padding: "14px 24px",
    boxSizing: "border-box",
    gap: 16,
  },

  /* Brand */
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "default",
    transition: "opacity .2s ease",
    userSelect: "none",
  },
  brandIcon: {
    fontSize: "1.4rem",
    lineHeight: 1,
    filter: "drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))",
  },
  brandText: {
    fontSize: "1.4rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "0.01em",
  },

  /* Right */
  right: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  /* Context pills */
  context: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    animation: "header-pillIn .35s ease both",
  },
  gamePill: {
    padding: "6px 14px",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: 24,
    background: "linear-gradient(135deg, #6366F1, #818CF8)",
    color: "#fff",
    whiteSpace: "nowrap",
    minHeight: 32,
    display: "flex",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
  },
  codePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    fontSize: "0.85rem",
    fontWeight: 700,
    borderRadius: 24,
    background: "rgba(238, 242, 255, 0.8)",
    backdropFilter: "blur(8px)",
    color: "#4F46E5",
    letterSpacing: "0.15em",
    whiteSpace: "nowrap",
    border: "2px solid rgba(129, 140, 248, 0.3)",
    minHeight: 32,
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.1)",
  },
  codePillLabel: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#A78BFA",
    letterSpacing: "0.1em",
  },

  /* Player pill */
  playerPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    fontSize: "0.85rem",
    fontWeight: 500,
    borderRadius: 24,
    background: "rgba(238, 242, 255, 0.8)",
    backdropFilter: "blur(8px)",
    color: "#4F46E5",
    whiteSpace: "nowrap",
    transition: "all .2s ease",
    minHeight: 32,
    border: "1px solid rgba(129, 140, 248, 0.2)",
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.08)",
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#22C55E",
    flexShrink: 0,
    boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.2)",
  },
  editHint: {
    fontSize: "0.75rem",
    color: "#A78BFA",
    marginLeft: 4,
  },

  /* Inline edit */
  editInput: {
    padding: "6px 14px",
    fontSize: "0.85rem",
    borderRadius: 24,
    border: "2px solid #6366F1",
    outline: "none",
    width: 140,
    boxSizing: "border-box",
    fontFamily: FONT,
    textAlign: "center",
    minHeight: 32,
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1)",
  },
};
