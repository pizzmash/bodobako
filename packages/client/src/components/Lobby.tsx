import { getAllGames } from "@bodobako/shared";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { API_BASE } from "../lib/socket";
import { NameEntryModal } from "./NameEntryModal";

const games = getAllGames();

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const BODY_FONT = "'Inter', 'Open Sans', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const GAMES_PER_PAGE = 6;

interface RoomInvite {
  inviteId: string;
  inviterName: string;
  roomCode: string;
  gameId: string;
  createdAt: number;
}

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

.lobby-invite-search:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  border-color: #6366F1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.lobby-page-btn {
  transition: background .15s ease, color .15s ease, transform .1s ease, box-shadow .15s ease;
}
.lobby-page-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.12) !important;
  color: #4F46E5 !important;
  transform: translateY(-1px);
}
.lobby-page-btn:active:not(:disabled) {
  transform: translateY(0);
}
.lobby-page-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
}
.lobby-page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.lobby-invite-item {
  transition: background .15s ease, border-color .15s ease;
}
.lobby-invite-item:hover {
  background: rgba(238, 242, 255, 0.9) !important;
  border-color: rgba(129, 140, 248, 0.45) !important;
}

.lobby-modal-btn {
  transition: all .2s ease;
}
.lobby-modal-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.lobby-modal-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .lobby-join-section {
    max-width: calc(100vw - 48px) !important;
    width: calc(100vw - 48px) !important;
  }
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
  const { idToken } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [inviteQueue, setInviteQueue] = useState<RoomInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const currentInvite = inviteQueue[0] ?? null;

  const filteredGames = games.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const pagedGames = filteredGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE,
  );

  const loadInvites = useCallback(async () => {
    if (!idToken) {
      setInviteQueue([]);
      return;
    }
    setIsLoadingInvites(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/invites`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setInviteQueue(await res.json() as RoomInvite[]);
      }
    } catch {
      setInviteQueue([]);
    } finally {
      setIsLoadingInvites(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (!idToken) {
      setInviteQueue([]);
      return;
    }
    void loadInvites();
  }, [idToken, loadInvites]);

  useEffect(() => {
    const handlePageShow = () => {
      void loadInvites();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [loadInvites]);

  const markInviteRead = useCallback(async (inviteId: string) => {
    if (!idToken) return;
    await fetch(`${API_BASE}/users/me/invites/${encodeURIComponent(inviteId)}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
  }, [idToken]);

  const dismissCurrentInvite = useCallback(async () => {
    if (!currentInvite) return;
    try {
      await markInviteRead(currentInvite.inviteId);
    } catch {
      // ignore
    }
    setInviteQueue((prev) => prev.slice(1));
  }, [currentInvite, markInviteRead]);

  const handleCreate = (gameId: string) => {
    createRoom(playerName, gameId);
  };

  const handleJoinFromInvite = async () => {
    if (!currentInvite || !playerName.trim()) return;
    try {
      await markInviteRead(currentInvite.inviteId);
    } catch {
      // ignore
    }
    setInviteQueue((prev) => prev.slice(1));
    joinRoom(currentInvite.roomCode, playerName);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName);
  };

  return (
    <>
      {!playerName && <NameEntryModal />}
      {currentInvite && (
        <div style={styles.inviteNoticeOverlay} role="dialog" aria-modal="true" aria-label="招待通知">
          <div style={styles.inviteNoticeCard}>
            <div style={styles.inviteNoticeBadge}>招待が届いています</div>
            <div style={styles.inviteNoticeTitle}>ルーム招待</div>
            <p style={styles.inviteNoticeText}>
              {currentInvite.inviterName}さんから
              {games.find((g) => g.id === currentInvite.gameId)?.name ?? "ゲーム"}
              への招待が届きました。
            </p>
            <div style={styles.inviteNoticeMeta}>ルームコード: {currentInvite.roomCode}</div>
            {inviteQueue.length > 1 && (
              <div style={styles.inviteNoticeCount}>残り {inviteQueue.length - 1} 件の招待があります</div>
            )}
            <div style={styles.inviteNoticeActions}>
              <button
                className="lobby-modal-btn"
                style={styles.inviteDismissBtn}
                onClick={() => void dismissCurrentInvite()}
                disabled={isLoadingInvites}
              >
                閉じる
              </button>
              <button
                className="lobby-modal-btn"
                style={styles.inviteJoinBtn}
                onClick={() => void handleJoinFromInvite()}
                disabled={!playerName.trim()}
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      )}
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
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            aria-label="ゲーム検索"
            type="search"
          />
        </div>
      </div>

      {/* ── Game cards grid ── */}
      <div style={styles.cardGrid}>
        {pagedGames.map((g, i) => (
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            className="lobby-page-btn"
            style={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="前のページ"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className="lobby-page-btn"
              style={{
                ...styles.pageBtn,
                ...(page === currentPage ? styles.pageBtnActive : {}),
              }}
              onClick={() => setCurrentPage(page)}
              aria-label={`${page}ページ目`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}
          <button
            className="lobby-page-btn"
            style={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="次のページ"
          >
            ›
          </button>
        </div>
      )}

      {/* ── Separator ── */}
      <div style={styles.separator}>
        <div style={styles.separatorLine} />
        <span style={styles.separatorText}>ルームコードで参加</span>
        <div style={styles.separatorLine} />
      </div>

      {/* ── Join room section ── */}
      <div className="lobby-join-section" style={styles.joinSection}>
        <input
          className="lobby-join-input"
          style={styles.joinInput}
          placeholder="例: A3K9"
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

    </>
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
    justifyContent: "flex-start",
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
    alignSelf: "flex-start",
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
    maxWidth: 480,
    padding: "0 24px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  joinInput: {
    flex: 1,
    minWidth: 0,
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

  pagination: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    position: "relative",
    zIndex: 1,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1.5px solid rgba(129, 140, 248, 0.3)",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(8px)",
    color: "#4F46E5",
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: FONT,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(99, 102, 241, 0.08)",
  },
  pageBtnActive: {
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    border: "none",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
  },

  inviteNoticeOverlay: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1200,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 76,
  },
  inviteNoticeCard: {
    pointerEvents: "auto",
    width: "min(480px, calc(100vw - 32px))",
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(12px)",
    borderRadius: 18,
    border: "2px solid rgba(129, 140, 248, 0.3)",
    boxShadow: "0 14px 36px rgba(99, 102, 241, 0.22)",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontFamily: BODY_FONT,
  },
  inviteNoticeBadge: {
    alignSelf: "flex-start",
    fontSize: "0.75rem",
    color: "#4338CA",
    background: "rgba(99, 102, 241, 0.14)",
    padding: "4px 8px",
    borderRadius: 999,
    fontWeight: 700,
  },
  inviteNoticeTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#312E81",
    fontFamily: FONT,
  },
  inviteNoticeText: {
    margin: 0,
    color: "#4338CA",
    fontSize: "0.93rem",
    lineHeight: 1.55,
  },
  inviteNoticeMeta: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "#4F46E5",
  },
  inviteNoticeCount: {
    fontSize: "0.8rem",
    color: "#6366F1",
    fontWeight: 600,
  },
  inviteNoticeActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 2,
  },
  inviteDismissBtn: {
    border: "1.5px solid rgba(129, 140, 248, 0.4)",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fff",
    color: "#4F46E5",
    fontWeight: 600,
    fontFamily: FONT,
    minHeight: 44,
    cursor: "pointer",
  },
  inviteJoinBtn: {
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    fontWeight: 700,
    fontFamily: FONT,
    minHeight: 44,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  },

  inviteModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.25)",
    backdropFilter: "blur(6px)",
    zIndex: 1300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  inviteModalCard: {
    width: "min(640px, 100%)",
    maxHeight: "min(760px, calc(100vh - 32px))",
    background: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    border: "2px solid rgba(129, 140, 248, 0.28)",
    boxShadow: "0 20px 45px rgba(99, 102, 241, 0.28)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  inviteModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "18px 18px 14px",
    borderBottom: "1px solid rgba(129, 140, 248, 0.2)",
  },
  inviteModalTitle: {
    fontFamily: FONT,
    color: "#312E81",
    fontWeight: 700,
    fontSize: "1.05rem",
  },
  inviteModalSubtitle: {
    marginTop: 4,
    fontSize: "0.84rem",
    fontWeight: 600,
    color: "#6366F1",
  },
  inviteModalCloseBtn: {
    border: "1.5px solid rgba(129, 140, 248, 0.36)",
    borderRadius: 10,
    background: "#fff",
    color: "#4F46E5",
    fontFamily: FONT,
    fontWeight: 600,
    minHeight: 44,
    padding: "10px 12px",
    cursor: "pointer",
  },
  inviteModalControls: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 18px",
    borderBottom: "1px solid rgba(129, 140, 248, 0.14)",
  },
  inviteModalSearchInput: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "2px solid rgba(129, 140, 248, 0.25)",
    padding: "10px 12px",
    fontFamily: BODY_FONT,
    fontSize: "0.95rem",
    color: "#312E81",
    outline: "none",
    background: "rgba(255, 255, 255, 0.96)",
    boxSizing: "border-box",
  },
  inviteModalControlButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  inviteSelectBtn: {
    border: "none",
    borderRadius: 10,
    background: "rgba(99, 102, 241, 0.12)",
    color: "#4338CA",
    minHeight: 40,
    padding: "8px 12px",
    fontWeight: 700,
    fontFamily: BODY_FONT,
    cursor: "pointer",
  },
  inviteClearBtn: {
    border: "1.5px solid rgba(129, 140, 248, 0.35)",
    borderRadius: 10,
    background: "#fff",
    color: "#4F46E5",
    minHeight: 40,
    padding: "8px 12px",
    fontWeight: 600,
    fontFamily: BODY_FONT,
    cursor: "pointer",
  },
  inviteFriendList: {
    padding: "12px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    minHeight: 180,
    maxHeight: 360,
  },
  inviteFriendItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1.5px solid rgba(129, 140, 248, 0.22)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.9)",
    cursor: "pointer",
  },
  inviteCheckbox: {
    width: 20,
    height: 20,
    margin: 0,
    accentColor: "#6366F1",
    flexShrink: 0,
  },
  inviteFriendTexts: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  inviteFriendName: {
    fontSize: "0.92rem",
    color: "#312E81",
    fontWeight: 700,
    fontFamily: BODY_FONT,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  inviteFriendCode: {
    fontSize: "0.78rem",
    color: "#818CF8",
    fontWeight: 600,
    letterSpacing: 0.4,
  },
  inviteListMessage: {
    padding: "24px 10px",
    textAlign: "center",
    color: "#6366F1",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  inviteModalFooter: {
    borderTop: "1px solid rgba(129, 140, 248, 0.2)",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  inviteModalHint: {
    color: "#6366F1",
    fontWeight: 600,
    fontSize: "0.8rem",
    fontFamily: BODY_FONT,
  },
  inviteCreateBtn: {
    border: "none",
    borderRadius: 12,
    minHeight: 44,
    padding: "10px 18px",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    fontWeight: 700,
    fontFamily: FONT,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(99, 102, 241, 0.28)",
  },
};
