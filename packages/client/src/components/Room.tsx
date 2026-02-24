import { getAllGames, getGameDefinition } from "@bodobako/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { API_BASE } from "../lib/socket";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

interface Friend {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface Follower extends Friend {
  isFollowing: boolean;
}

function Avatar({ photoURL, displayName }: { photoURL?: string; displayName: string }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        referrerPolicy="no-referrer"
        style={styles.inviteAvatar}
      />
    );
  }

  return (
    <div style={styles.inviteAvatarFallback} aria-hidden="true">
      {displayName[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/* ── Injected styles for modal animations ── */
const INJECTED_STYLES = `
@keyframes room-bounceIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(.85); }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes room-fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* ローディング用: 外側リング */
@keyframes room-spin-outer {
  to { transform: rotate(360deg); }
}
/* ローディング用: 内側リング（逆回転） */
@keyframes room-spin-inner {
  to { transform: rotate(-360deg); }
}
/* モーダル枚のパルスグロー */
@keyframes room-modal-pulse {
  0%, 100% { box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 0 rgba(99,102,241,0.3); }
  50%       { box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 8px rgba(99,102,241,0); }
}
/* 接続中テキストのドットアニメーション */
@keyframes room-dots {
  0%, 20%  { content: ''; }
  40%      { content: '.'; }
  60%      { content: '..'; }
  80%, 100% { content: '...'; }
}
.room-loading-dots::after {
  content: '';
  animation: room-dots 1.4s steps(1) infinite;
}
.room-start-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.room-start-btn:active:not(:disabled) {
  transform: translateY(0);
}
.room-leave-btn:hover {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}
.room-invite-search:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  border-color: #6366F1 !important;
}
.room-invite-item:hover {
  background: #eef2ff !important;
  border-color: #a5b4fc !important;
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "room-modal-styles";
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

export function Room() {
  useInjectStyles();
  const { room, playerId, startGame, leaveRoom, isCreatingRoom, creatingGameId } = useRoom();
  const { idToken } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ローディング中はスピナー付きモーダルを表示
  if (isCreatingRoom && !room) {
    const allGames = getAllGames();
    const pendingGame = creatingGameId ? allGames.find((g) => g.id === creatingGameId) : null;
    return (
      <div style={styles.backdrop}>
        <div style={{ ...styles.modal, animation: "room-bounceIn .4s ease both", animationFillMode: "both" }}>
          {/* ゲーム名 */}
          <div style={styles.gameName}>{pendingGame?.name ?? "ゲーム"}</div>

          {/* 二重リングスピナー */}
          <div style={loadingStyles.spinnerWrap}>
            {/* 外側リング */}
            <div style={loadingStyles.outerRing} />
            {/* 内側リング */}
            <div style={loadingStyles.innerRing} />
            {/* 中心ドット */}
            <div style={loadingStyles.centerDot} />
          </div>

          {/* 接続中テキスト */}
          <div style={loadingStyles.connectingText}>
            <span className="room-loading-dots">ルームを作成中</span>
          </div>
          <div style={loadingStyles.subText}>サーバーに接続しています</div>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const gameDef = getGameDefinition(room.gameId);
  const gameName = gameDef?.name ?? room.gameId;
  const minPlayers = gameDef?.minPlayers ?? 2;
  const maxPlayers = gameDef?.maxPlayers ?? 2;
  const isHost = playerId === room.hostId;
  const canStart = isHost && room.players.length >= minPlayers;

  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((friend) => friend.displayName.toLowerCase().includes(query));
  }, [friends, friendSearch]);

  const loadFriends = useCallback(async () => {
    if (!idToken) {
      setFriends([]);
      return;
    }
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/followers`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const followers = await res.json() as Follower[];
        const mutualFriends = followers
          .filter((follower) => follower.isFollowing)
          .map(({ uid, displayName, photoURL }) => ({ uid, displayName, photoURL }));
        setFriends(mutualFriends);
      } else {
        setFriends([]);
      }
    } catch {
      setFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (!isInviteModalOpen) return;
    void loadFriends();
  }, [isInviteModalOpen, loadFriends]);

  const toggleFriend = (uid: string) => {
    setSelectedFriendUids((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const selectAllFiltered = () => {
    setSelectedFriendUids((prev) => {
      const merged = new Set(prev);
      for (const friend of filteredFriends) merged.add(friend.uid);
      return Array.from(merged);
    });
  };

  const clearSelection = () => setSelectedFriendUids([]);

  const openInviteModal = () => {
    setInviteError(null);
    setInviteSuccess(null);
    setFriendSearch("");
    setSelectedFriendUids([]);
    setIsInviteModalOpen(true);
  };

  const sendInvites = async () => {
    if (!idToken || !room || selectedFriendUids.length === 0) return;
    setIsSendingInvites(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/rooms/${room.code}/invites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitedUids: selectedFriendUids }),
      });

      const body = await res.json() as { created?: number; error?: string };
      if (!res.ok) {
        setInviteError(body.error ?? "招待の送信に失敗しました");
        return;
      }

      setInviteSuccess(`${body.created ?? 0}人に招待を送りました`);
      setSelectedFriendUids([]);
      setFriendSearch("");
    } catch {
      setInviteError("招待の送信に失敗しました");
    } finally {
      setIsSendingInvites(false);
    }
  };

  return (
    <>
      <div style={styles.backdrop}>
        <div style={styles.modal}>
        {/* Game name */}
        <div style={styles.gameName}>{gameName}</div>

        {/* Room code */}
        <div style={styles.codeLabel}>ルームコード</div>
        <div style={styles.code}>{room.code}</div>
        <p style={styles.hint}>このコードを相手に伝えてください</p>

        {/* Player list */}
        <div style={styles.playersSection}>
          <div style={styles.playersTitle}>
            プレイヤー ({room.players.length}/{maxPlayers})
          </div>
          <div style={styles.playersList}>
            {room.players.map((p) => (
              <div key={p.id} style={styles.playerCapsule}>
                {p.name}
                {p.id === room.hostId && (
                  <span style={styles.hostBadge}>ホスト</span>
                )}
              </div>
            ))}
          </div>
          {room.players.length < minPlayers && (
            <div style={styles.waiting}>相手を待っています...</div>
          )}
        </div>

        {/* Buttons */}
          <div style={styles.buttons}>
            {isHost ? (
              <>
                <button
                  className="room-start-btn"
                  style={{
                    ...styles.startBtn,
                    opacity: canStart ? 1 : 0.5,
                    cursor: canStart ? "pointer" : "not-allowed",
                  }}
                  onClick={startGame}
                  disabled={!canStart}
                >
                  ゲーム開始
                </button>
                <button
                  style={styles.inviteBtn}
                  onClick={openInviteModal}
                  disabled={!idToken}
                >
                  フレンドを招待
                </button>
              </>
            ) : (
              <div style={styles.waitingHost}>
                ホストがゲームを開始するのを待っています...
              </div>
            )}
            <button
              className="room-leave-btn"
              style={styles.leaveBtn}
              onClick={leaveRoom}
            >
              退出する
            </button>
          </div>
        </div>
      </div>

      {isInviteModalOpen && (
        <div style={styles.inviteModalBackdrop}>
          <div style={styles.inviteModal}>
            <div style={styles.inviteModalHeader}>
              <div>
                <div style={styles.inviteModalTitle}>フレンドを招待</div>
                <div style={styles.inviteModalSubtitle}>{selectedFriendUids.length}人選択中</div>
              </div>
              <button style={styles.inviteCloseBtn} onClick={() => setIsInviteModalOpen(false)}>閉じる</button>
            </div>

            <input
              className="room-invite-search"
              style={styles.inviteSearchInput}
              placeholder="フレンド名 / コードで検索"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              type="search"
            />

            <div style={styles.inviteActionRow}>
              <button style={styles.inviteActionBtn} onClick={selectAllFiltered} disabled={filteredFriends.length === 0}>表示中を全選択</button>
              <button style={styles.inviteActionBtnSecondary} onClick={clearSelection} disabled={selectedFriendUids.length === 0}>選択解除</button>
            </div>

            <div style={styles.inviteFriendList}>
              {isLoadingFriends ? (
                <div style={styles.inviteInfoText}>フレンドを読み込み中です...</div>
              ) : filteredFriends.length === 0 ? (
                <div style={styles.inviteInfoText}>一致するフレンドがいません</div>
              ) : (
                filteredFriends.map((friend) => (
                  <label key={friend.uid} className="room-invite-item" style={styles.inviteFriendItem}>
                    <input
                      type="checkbox"
                      checked={selectedFriendUids.includes(friend.uid)}
                      onChange={() => toggleFriend(friend.uid)}
                      style={styles.inviteCheckbox}
                    />
                    <Avatar photoURL={friend.photoURL} displayName={friend.displayName} />
                    <div style={styles.inviteFriendTextWrap}>
                      <div style={styles.inviteFriendName}>{friend.displayName}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {inviteError && <div style={styles.inviteError}>{inviteError}</div>}
            {inviteSuccess && <div style={styles.inviteSuccess}>{inviteSuccess}</div>}

            <div style={styles.inviteFooter}>
              <button
                style={{
                  ...styles.inviteSendBtn,
                  opacity: selectedFriendUids.length > 0 && !isSendingInvites ? 1 : 0.5,
                  cursor: selectedFriendUids.length > 0 && !isSendingInvites ? "pointer" : "not-allowed",
                }}
                onClick={() => void sendInvites()}
                disabled={selectedFriendUids.length === 0 || isSendingInvites}
              >
                {isSendingInvites ? "送信中..." : "招待を送信"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 1000,
    animation: "room-fadeIn .25s ease",
  },
  modal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#fff",
    borderRadius: 16,
    padding: "36px 40px",
    width: 400,
    maxWidth: "calc(100% - 48px)",
    boxSizing: "border-box",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontFamily: FONT,
    color: "#2d3748",
    animation: "room-bounceIn .4s ease both",
  },
  gameName: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: "0.8rem",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  code: {
    fontSize: "2.2rem",
    fontWeight: 700,
    letterSpacing: "0.3em",
    padding: "8px 24px",
    background: "#f0f4f8",
    borderRadius: 10,
    color: "#2d3748",
  },
  hint: {
    color: "#a0aec0",
    fontSize: "0.82rem",
    margin: "2px 0 8px 0",
  },
  playersSection: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    margin: "8px 0",
  },
  playersTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#4a5568",
  },
  playersList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  playerCapsule: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    background: "#edf2f7",
    borderRadius: 20,
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  hostBadge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    background: "#4a6fa5",
    color: "#fff",
    borderRadius: 6,
    padding: "1px 6px",
  },
  waiting: {
    color: "#a0aec0",
    fontStyle: "italic",
    fontSize: "0.85rem",
  },
  buttons: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },
  startBtn: {
    width: "100%",
    padding: "12px 0",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    background: "#4a6fa5",
    color: "#fff",
    cursor: "pointer",
    transition: "filter .15s ease, transform .1s ease",
  },
  waitingHost: {
    textAlign: "center",
    color: "#718096",
    fontSize: "0.9rem",
    padding: "8px 0",
  },
  leaveBtn: {
    width: "100%",
    padding: "10px 0",
    fontSize: "0.9rem",
    fontWeight: 500,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "transparent",
    color: "#718096",
    cursor: "pointer",
    transition: "background .15s ease, color .15s ease",
  },
  inviteBtn: {
    width: "100%",
    padding: "10px 0",
    fontSize: "0.92rem",
    fontWeight: 600,
    borderRadius: 10,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#4338ca",
    cursor: "pointer",
    minHeight: 44,
  },
  inviteModalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    background: "rgba(15, 23, 42, 0.25)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  inviteModal: {
    width: "min(620px, 100%)",
    maxHeight: "min(760px, calc(100vh - 32px))",
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #dbeafe",
    boxShadow: "0 24px 56px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: FONT,
  },
  inviteModalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 16px 12px",
    borderBottom: "1px solid #e2e8f0",
  },
  inviteModalTitle: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#312e81",
  },
  inviteModalSubtitle: {
    marginTop: 4,
    fontSize: "0.82rem",
    color: "#6366f1",
    fontWeight: 600,
  },
  inviteCloseBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: 10,
    minHeight: 44,
    padding: "10px 12px",
    color: "#475569",
    cursor: "pointer",
  },
  inviteSearchInput: {
    margin: "12px 16px 0",
    width: "calc(100% - 32px)",
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    minHeight: 44,
    padding: "10px 12px",
    boxSizing: "border-box",
    fontSize: "0.92rem",
  },
  inviteActionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 16px",
  },
  inviteActionBtn: {
    minHeight: 40,
    borderRadius: 10,
    border: "none",
    background: "#e0e7ff",
    color: "#4338ca",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  inviteActionBtnSecondary: {
    minHeight: 40,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#475569",
    padding: "8px 12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  inviteFriendList: {
    padding: "4px 16px 12px",
    maxHeight: 320,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  inviteFriendItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#fff",
    cursor: "pointer",
  },
  inviteCheckbox: {
    width: 20,
    height: 20,
    margin: 0,
    accentColor: "#6366f1",
    flexShrink: 0,
  },
  inviteFriendTextWrap: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  inviteAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #cbd5e1",
    flexShrink: 0,
  },
  inviteAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#c7d2fe",
    color: "#312e81",
    fontWeight: 700,
    fontSize: "0.82rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inviteFriendName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#1e293b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  inviteInfoText: {
    textAlign: "center",
    padding: "20px 8px",
    color: "#64748b",
    fontWeight: 600,
    fontSize: "0.88rem",
  },
  inviteError: {
    margin: "0 16px",
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: "0.84rem",
    fontWeight: 600,
  },
  inviteSuccess: {
    margin: "0 16px",
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: "0.84rem",
    fontWeight: 600,
  },
  inviteFooter: {
    padding: "12px 16px 16px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
  },
  inviteSendBtn: {
    minHeight: 44,
    borderRadius: 10,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 700,
    padding: "10px 16px",
  },
};
/* ── Loading spinner styles ── */
const SPINNER_SIZE = 88;
const loadingStyles: Record<string, React.CSSProperties> = {
  spinnerWrap: {
    position: "relative",
    width: SPINNER_SIZE,
    height: SPINNER_SIZE,
    margin: "12px auto 4px",
    flexShrink: 0,
  },
  outerRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "4px solid #e2e8f0",
    borderTopColor: "#6366F1",
    borderRightColor: "#818CF8",
    animation: "room-spin-outer 1s cubic-bezier(0.4,0,0.2,1) infinite",
  },
  innerRing: {
    position: "absolute",
    inset: 14,
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    borderBottomColor: "#a5b4fc",
    borderLeftColor: "#c7d2fe",
    animation: "room-spin-inner 0.75s cubic-bezier(0.4,0,0.2,1) infinite",
  },
  centerDot: {
    position: "absolute",
    inset: 0,
    margin: "auto",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366F1, #818CF8)",
    boxShadow: "0 2px 8px rgba(99,102,241,0.5)",
  },
  connectingText: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#4F46E5",
    fontFamily: FONT,
    marginTop: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: "0.82rem",
    color: "#a0aec0",
    fontFamily: FONT,
    textAlign: "center",
    marginTop: 2,
  },
};