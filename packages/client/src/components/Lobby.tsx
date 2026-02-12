import { useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext";
import { getAllGames } from "@bodobako/shared";

const games = getAllGames();

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

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
  const color = `hsl(${hue}, 55%, 50%)`;
  const bgColor = `hsl(${hue}, 30%, 92%)`;

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
        width: 60,
        height: 60,
        padding: 6,
        background: bgColor,
        borderRadius: 8,
        flexShrink: 0,
      }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          style={{
            borderRadius: 2,
            background: on ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

/* ── Injected styles for hover effects ── */
const INJECTED_STYLES = `
@keyframes lobby-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lobby-card {
  transition: transform .15s ease, box-shadow .15s ease;
}
.lobby-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,.12) !important;
}
.lobby-create-btn {
  transition: background .15s ease, transform .1s ease;
}
.lobby-create-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.lobby-create-btn:active:not(:disabled) {
  transform: translateY(0);
}
.lobby-join-btn {
  transition: background .15s ease, transform .1s ease;
}
.lobby-join-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.lobby-name-highlight {
  animation: lobby-shake .4s ease;
}
@keyframes lobby-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
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
  const { createRoom, joinRoom, errorMsg, clearError } = useRoom();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const filteredGames = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  const validateName = (): boolean => {
    if (!playerName.trim()) {
      setNameError(true);
      nameInputRef.current?.focus();
      // reset animation by re-triggering
      const el = nameInputRef.current;
      if (el) {
        el.classList.remove("lobby-name-highlight");
        void el.offsetWidth; // force reflow
        el.classList.add("lobby-name-highlight");
      }
      return false;
    }
    return true;
  };

  const handleCreate = (gameId: string) => {
    if (!validateName()) return;
    createRoom(playerName.trim(), gameId);
  };

  const handleJoin = () => {
    if (!validateName()) return;
    if (!roomCode.trim()) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  // Clear name error when user starts typing
  useEffect(() => {
    if (playerName.trim()) setNameError(false);
  }, [playerName]);

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerTitle}>🎲 ボド箱</div>
        <div style={styles.headerRight}>
          <input
            ref={nameInputRef}
            style={{
              ...styles.nameInput,
              borderColor: nameError ? "#e05555" : "#e2e8f0",
              boxShadow: nameError
                ? "0 0 0 2px rgba(224,85,85,.25)"
                : "none",
            }}
            placeholder="プレイヤー名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          {nameError && (
            <span style={styles.nameErrorText}>名前を入力してください</span>
          )}
        </div>
      </header>

      {/* ── Error banner ── */}
      {errorMsg && (
        <div style={styles.error} onClick={clearError}>
          {errorMsg}（クリックで閉じる）
        </div>
      )}

      {/* ── Search bar ── */}
      <div style={styles.searchSection}>
        <input
          style={styles.searchInput}
          placeholder="🔍 ゲームを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
          style={styles.joinInput}
          placeholder="ルームコード（例: A3K9）"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={4}
        />
        <button
          className="lobby-join-btn"
          style={styles.joinBtn}
          onClick={handleJoin}
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
    fontFamily: FONT,
    background: "#f8fafc",
    color: "#2d3748",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 800,
    padding: "20px 24px",
    boxSizing: "border-box",
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  nameInput: {
    padding: "8px 12px",
    fontSize: "0.9rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    outline: "none",
    width: 180,
    boxSizing: "border-box",
    transition: "border-color .15s, box-shadow .15s",
  },
  nameErrorText: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 4,
    fontSize: "0.75rem",
    color: "#e05555",
    whiteSpace: "nowrap",
  },

  /* Error */
  error: {
    background: "#fff0f0",
    color: "#c00",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    maxWidth: 752,
    width: "calc(100% - 48px)",
    boxSizing: "border-box",
    textAlign: "center",
    fontSize: "0.9rem",
  },

  /* Search */
  searchSection: {
    width: "100%",
    maxWidth: 800,
    padding: "0 24px",
    boxSizing: "border-box",
    marginBottom: 16,
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "0.95rem",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    transition: "border-color .15s",
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
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    width: 340,
    maxWidth: "100%",
    boxSizing: "border-box",
    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    animation: "lobby-fadeIn .4s ease both",
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
    fontSize: "1.15rem",
    fontWeight: 700,
  },
  playerCount: {
    fontSize: "0.8rem",
    color: "#718096",
  },
  cardDesc: {
    fontSize: "0.88rem",
    color: "#4a5568",
    margin: 0,
    lineHeight: 1.5,
  },
  createBtn: {
    padding: "10px 0",
    fontSize: "0.95rem",
    fontWeight: 600,
    borderRadius: 8,
    border: "none",
    background: "#4a6fa5",
    color: "#fff",
    cursor: "pointer",
    marginTop: "auto",
  },

  noResults: {
    padding: "32px 0",
    color: "#718096",
    fontSize: "0.95rem",
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
  },
  separatorLine: {
    flex: 1,
    height: 1,
    background: "#e2e8f0",
  },
  separatorText: {
    fontSize: "0.85rem",
    color: "#a0aec0",
    flexShrink: 0,
  },

  /* Join section */
  joinSection: {
    display: "flex",
    gap: 10,
    width: "100%",
    maxWidth: 400,
    padding: "0 24px",
    boxSizing: "border-box",
  },
  joinInput: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "1rem",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: 2,
  },
  joinBtn: {
    padding: "10px 24px",
    fontSize: "0.95rem",
    fontWeight: 600,
    borderRadius: 8,
    border: "none",
    background: "#4a6fa5",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};
