import { useEffect, useState, useRef } from "react";
import { useRoom } from "../context/RoomContext";
import { getGameDefinition } from "@bodobako/shared";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const INJECTED_STYLES = `
@keyframes header-slideDown {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes header-pillIn {
  from { opacity: 0; transform: scale(.85); }
  to   { opacity: 1; transform: scale(1); }
}
.app-header-brand:hover {
  opacity: .8;
}
.app-header-name:hover {
  background: #e8edf4 !important;
}
@media (max-width: 480px) {
  .app-header-inner {
    flex-wrap: wrap;
    justify-content: center !important;
    gap: 4px !important;
    padding: 8px 16px !important;
  }
  .app-header-right {
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
        <div className="app-header-brand" style={styles.brand}>
          <span style={styles.brandIcon}>🎲</span>
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
            <span
              className={room ? "" : "app-header-name"}
              style={{
                ...styles.playerPill,
                cursor: room ? "default" : "pointer",
              }}
              onClick={startEdit}
              title={room ? displayName : "クリックで名前を変更"}
            >
              <span style={styles.playerDot} />
              {displayName}
              {!room && <span style={styles.editHint}>✎</span>}
            </span>
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
    background: "rgba(255, 255, 255, 0.82)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
    animation: "header-slideDown .35s ease",
    fontFamily: FONT,
  },
  inner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 800,
    margin: "0 auto",
    padding: "12px 24px",
    boxSizing: "border-box",
  },

  /* Brand */
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "default",
    transition: "opacity .15s",
    userSelect: "none",
  },
  brandIcon: {
    fontSize: "1.4rem",
    lineHeight: 1,
  },
  brandText: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#2d3748",
    letterSpacing: "0.02em",
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
    gap: 8,
    animation: "header-pillIn .3s ease both",
  },
  gamePill: {
    padding: "4px 12px",
    fontSize: "0.8rem",
    fontWeight: 600,
    borderRadius: 20,
    background: "linear-gradient(135deg, #4a6fa5, #5b83bd)",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  codePill: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    fontSize: "0.8rem",
    fontWeight: 700,
    borderRadius: 20,
    background: "#f0f4f8",
    color: "#4a5568",
    letterSpacing: "0.12em",
    whiteSpace: "nowrap",
  },
  codePillLabel: {
    fontSize: "0.6rem",
    fontWeight: 600,
    color: "#a0aec0",
    letterSpacing: "0.08em",
  },

  /* Player pill */
  playerPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    fontSize: "0.8rem",
    fontWeight: 500,
    borderRadius: 20,
    background: "#f0f4f8",
    color: "#2d3748",
    whiteSpace: "nowrap",
    transition: "background .15s",
  },
  playerDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#48bb78",
    flexShrink: 0,
  },
  editHint: {
    fontSize: "0.7rem",
    color: "#a0aec0",
    marginLeft: 2,
  },

  /* Inline edit */
  editInput: {
    padding: "4px 10px",
    fontSize: "0.8rem",
    borderRadius: 20,
    border: "2px solid #4a6fa5",
    outline: "none",
    width: 120,
    boxSizing: "border-box",
    fontFamily: FONT,
    textAlign: "center",
  },
};
