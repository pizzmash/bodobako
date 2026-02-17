import { getAllGames } from "@bodobako/shared";
import { useEffect, useState } from "react";
import { useRoom } from "../context/RoomContext";

const games = getAllGames();

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const BODY_FONT = "'Inter', 'Open Sans', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* ── helper: simple string hash ── */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned
}

/* ── CSS Identicon (5×5 symmetric grid) ── */
function GameIdenticon({ gameId }: { gameId: string }) {
  const h = hashCode(gameId);
  const hue = h % 360;
  const color = `hsl(${hue}, 65%, 55%)`;
  const bgColor = `hsl(${hue}, 45%, 95%)`;

  // 3 columns × 5 rows = 15 bits → mirror cols 0,1 to get 4,3
  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    const left: boolean[] = [];
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col;
      left.push(((h >> bitIndex) & 1) === 1);
    }
    // mirror: col0 col1 col2 col1 col0
    cells.push(...left, left[1], left[0]);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 2,
        width: 64,
        height: 64,
        padding: 8,
        background: bgColor,
        borderRadius: 12,
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          style={{
            borderRadius: 2,
            background: on ? color : "transparent",
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ── Injected styles for hover effects & animations ── */
const INJECTED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

@keyframes lobby-fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .lobby-card, .lobby-create-btn, .lobby-join-btn {
    animation: none !important;
    transition: none !important;
  }
}

.lobby-card {
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.lobby-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(129, 140, 248, 0.3) !important;
  border-color: rgba(99, 102, 241, 0.4) !important;
  background: rgba(255, 255, 255, 0.95) !important;
}
.lobby-card:focus-within {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.lobby-create-btn {
  transition: background .2s ease, transform .15s ease, box-shadow .2s ease;
}
.lobby-create-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.5);
}
.lobby-create-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(30, 64, 175, 0.3);
}
.lobby-create-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.lobby-join-btn {
  transition: background .2s ease, transform .15s ease, box-shadow .2s ease;
}
.lobby-join-btn:hover:not(:disabled) {
  background: #16A34A !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}
.lobby-join-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
}
.lobby-join-btn:focus {
  outline: 3px solid #22C55E;
  outline-offset: 2px;
}

.lobby-search-input:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  border-color: #6366F1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(99, 102, 241, 0.15);
}

.lobby-join-input:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  border-color: #6366F1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(99, 102, 241, 0.15);
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "lobby-styles";
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

export function Lobby() {
  useInjectStyles();
  const { playerName, createRoom, joinRoom, errorMsg, clearError } = useRoom();
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGames = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  const handleCreate = (gameId: string) => {
    createRoom(playerName, gameId);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName);
  };

  return (
    <div style={styles.container}>
      {/* 装飾的な背景グラデーション */}
      <div style={styles.bgDecoration1} />
      <div style={styles.bgDecoration2} />
      
      {/* ── Error banner ── */}
      {errorMsg && (
        <div style={styles.error} onClick={clearError}>
          {errorMsg}（クリックで閉じる）
        </div>
      )}

      {/* ── Search bar ── */}
      <div style={styles.searchSection}>
        <div style={styles.searchWrapper}>
          <svg
            style={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="#6366F1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            className="lobby-search-input"
            style={styles.searchInput}
            placeholder="ゲームを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="ゲーム検索"
            type="search"
          />
        </div>
      </div>

      {/* ── Game cards grid ── */}
      <div style={styles.cardGrid}>
        {filteredGames.map((g, i) => (
          <div
            key={g.id}
            className="lobby-card"
            style={{
              ...styles.card,
              animationDelay: `${i * 0.06}s`,
            }}
          >
            <div style={styles.cardHeader}>
              <GameIdenticon gameId={g.id} />
              <div style={styles.cardHeaderText}>
                <div style={styles.cardTitle}>{g.name}</div>
                <div style={styles.playerCount}>
                  {g.minPlayers === g.maxPlayers
                    ? `${g.minPlayers}人`
                    : `${g.minPlayers}-${g.maxPlayers}人`}
                </div>
              </div>
            </div>
            <p style={styles.cardDesc}>{g.description}</p>
            <button
              className="lobby-create-btn"
              style={styles.createBtn}
              onClick={() => handleCreate(g.id)}
              aria-label={`${g.name}のルームを作成`}
            >
              ルームを作成
            </button>
          </div>
        ))}
        {filteredGames.length === 0 && (
          <div style={styles.noResults}>
            該当するゲームが見つかりませんでした
          </div>
        )}
      </div>

      {/* ── Separator ── */}
      <div style={styles.separator}>
        <div style={styles.separatorLine} />
        <span style={styles.separatorText}>または</span>
        <div style={styles.separatorLine} />
      </div>

      {/* ── Join room section ── */}
      <div style={styles.joinSection}>
        <input
          className="lobby-join-input"
          style={styles.joinInput}
          placeholder="ルームコード（例: A3K9）"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          maxLength={4}
          aria-label="ルームコード入力"
          type="text"
          inputMode="text"
        />
        <button
          className="lobby-join-btn"
          style={styles.joinBtn}
          onClick={handleJoin}
          disabled={!roomCode.trim()}
          aria-label="ルームに参加"
        >
          参加する
        </button>
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    fontFamily: BODY_FONT,
    background: "linear-gradient(135deg, #EEF2FF 0%, #F8FAFE 50%, #FAF5FF 100%)",
    color: "#312E81",
    paddingTop: 24,
    position: "relative",
    overflow: "hidden",
  },

  /* 装飾的な背景要素 */
  bgDecoration1: {
    position: "absolute",
    top: "-10%",
    right: "-5%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgDecoration2: {
    position: "absolute",
    bottom: "-15%",
    left: "-8%",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(129, 140, 248, 0.08) 0%, transparent 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0,
  },

  /* Error */
  error: {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
    backdropFilter: "blur(12px)",
    color: "#991B1B",
    padding: "12px 24px",
    borderRadius: 16,
    cursor: "pointer",
    maxWidth: 752,
    width: "calc(100% - 48px)",
    boxSizing: "border-box",
    textAlign: "center",
    fontSize: "0.95rem",
    fontWeight: 600,
    border: "2px solid rgba(239, 68, 68, 0.3)",
    marginBottom: 16,
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
    position: "relative",
    zIndex: 1,
  },

  /* Search */
  searchSection: {
    width: "100%",
    maxWidth: 800,
    padding: "0 24px",
    boxSizing: "border-box",
    marginBottom: 16,
    position: "relative",
    zIndex: 1,
  },
  searchWrapper: {
    position: "relative",
    width: "100%",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    zIndex: 1,
  },
  searchInput: {
    width: "100%",
    padding: "14px 18px 14px 48px",
    fontSize: "1rem",
    borderRadius: 16,
    border: "2px solid rgba(129, 140, 248, 0.2)",
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    transition: "all .2s ease",
    fontFamily: BODY_FONT,
    color: "#312E81",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.08)",
  },

  /* Card grid */
  cardGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
    maxWidth: 800,
    padding: "0 24px",
    boxSizing: "border-box",
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(16px)",
    borderRadius: 20,
    border: "2px solid rgba(129, 140, 248, 0.2)",
    padding: 24,
    width: 360,
    maxWidth: "100%",
    boxSizing: "border-box",
    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    animation: "lobby-fadeIn .5s ease both",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  cardHeaderText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    fontFamily: FONT,
    color: "#4F46E5",
    letterSpacing: "-0.01em",
  },
  playerCount: {
    fontSize: "0.85rem",
    color: "#818CF8",
    fontWeight: 600,
    background: "rgba(129, 140, 248, 0.1)",
    padding: "2px 10px",
    borderRadius: 12,
    display: "inline-block",
  },
  cardDesc: {
    fontSize: "0.9rem",
    color: "#4C1D95",
    margin: 0,
    lineHeight: 1.6,
    fontFamily: BODY_FONT,
    opacity: 0.8,
  },
  createBtn: {
    padding: "14px 0",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    cursor: "pointer",
    marginTop: "auto",
    minHeight: 48,
    fontFamily: FONT,
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
    position: "relative",
    overflow: "hidden",
  },

  noResults: {
    padding: "48px 24px",
    color: "#818CF8",
    fontSize: "1rem",
    textAlign: "center",
    fontFamily: BODY_FONT,
    fontWeight: 500,
    width: "100%",
  },

  /* Separator */
  separator: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    maxWidth: 800,
    padding: "24px 24px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  separatorLine: {
    flex: 1,
    height: 2,
    background: "linear-gradient(to right, transparent, rgba(129, 140, 248, 0.3) 20%, rgba(129, 140, 248, 0.3) 80%, transparent)",
    borderRadius: 2,
  },
  separatorText: {
    fontSize: "0.9rem",
    color: "#818CF8",
    flexShrink: 0,
    fontWeight: 600,
    fontFamily: BODY_FONT,
    padding: "0 8px",
  },

  /* Join section */
  joinSection: {
    display: "flex",
    gap: 10,
    width: "100%",
    maxWidth: 400,
    padding: "0 24px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  joinInput: {
    flex: 1,
    padding: "14px 18px",
    fontSize: "1.1rem",
    borderRadius: 16,
    border: "2px solid rgba(129, 140, 248, 0.3)",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: 3,
    fontWeight: 600,
    fontFamily: FONT,
    color: "#4F46E5",
    minHeight: 48,
    textTransform: "uppercase",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.08)",
  },
  joinBtn: {
    padding: "14px 32px",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    minHeight: 48,
    fontFamily: FONT,
    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
  },
};
