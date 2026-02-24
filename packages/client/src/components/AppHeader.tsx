import { getGameDefinition } from "@bodobako/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { API_BASE } from "../lib/socket";

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* SVGアイコンコンポーネント */
const GameIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
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
  .app-header-brand, .app-header-name, .app-header-inner, .app-header-menu-btn {
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

.app-header-menu-btn {
  transition: background .2s ease, box-shadow .2s ease, transform .15s ease;
}
.app-header-menu-btn:hover {
  background: rgba(99, 102, 241, 0.15) !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2) !important;
  transform: translateY(-1px);
}
.app-header-menu-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}
.app-header-menu-btn:active {
  transform: translateY(0);
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

interface AppHeaderProps {
  onMenuClick: () => void;
}

type FriendRelation = "none" | "outgoing" | "incoming" | "friend";

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  useInjectStyles();
  const { room, playerId, playerName, setPlayerName } = useRoom();
  const { firebaseUser, idToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const [profilesByUid, setProfilesByUid] = useState<Record<string, UserProfile>>({});
  const [relationByUid, setRelationByUid] = useState<Record<string, FriendRelation>>({});
  const [activePopoverPlayerId, setActivePopoverPlayerId] = useState<string | null>(null);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const gameDef = room ? getGameDefinition(room.gameId) : null;
  const myPlayer = room?.players.find((p) => p.id === playerId);
  const displayName = myPlayer?.name ?? playerName;
  const activePlayer = useMemo(
    () => room?.players.find((player) => player.id === activePopoverPlayerId) ?? null,
    [room, activePopoverPlayerId],
  );
  const activeUid = activePlayer?.userId ?? "";
  const activeProfile = activeUid ? profilesByUid[activeUid] : null;
  const activeRelation: FriendRelation | null = activeUid ? (relationByUid[activeUid] ?? "none") : null;

  const canEdit = !room && !firebaseUser;

  const startEdit = () => {
    if (!canEdit) return;
    setDraft(playerName);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!room) {
      setProfilesByUid({});
      setActivePopoverPlayerId(null);
      return;
    }

    const userIds = Array.from(
      new Set(room.players.map((player) => player.userId).filter((uid): uid is string => Boolean(uid))),
    );
    if (userIds.length === 0) {
      setProfilesByUid({});
      return;
    }

    let canceled = false;
    void (async () => {
      const results = await Promise.all(userIds.map(async (uid) => {
        try {
          const res = await fetch(`${API_BASE}/users/${uid}/profile`);
          if (!res.ok) return null;
          const profile = await res.json() as UserProfile;
          return [uid, profile] as const;
        } catch {
          return null;
        }
      }));

      if (canceled) return;
      const nextProfiles: Record<string, UserProfile> = {};
      for (const row of results) {
        if (!row) continue;
        const [uid, profile] = row;
        nextProfiles[uid] = profile;
      }
      setProfilesByUid(nextProfiles);
    })();

    return () => {
      canceled = true;
    };
  }, [room]);

  useEffect(() => {
    if (!room || !idToken || !firebaseUser) {
      setRelationByUid({});
      return;
    }

    let canceled = false;
    void (async () => {
      try {
        const [followingRes, followersRes] = await Promise.all([
          fetch(`${API_BASE}/users/me/friends`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`${API_BASE}/users/me/followers`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
        ]);

        if (!followingRes.ok || !followersRes.ok || canceled) return;

        const following = await followingRes.json() as Array<{ uid: string }>;
        const followers = await followersRes.json() as Array<{ uid: string; isFollowing: boolean }>;

        const followingSet = new Set(following.map((friend) => friend.uid));
        const followerMap = new Map(followers.map((follower) => [follower.uid, follower.isFollowing]));

        const nextRelations: Record<string, FriendRelation> = {};
        for (const player of room.players) {
          const uid = player.userId;
          if (!uid || uid === firebaseUser.uid) continue;
          const followerIsFollowing = followerMap.get(uid);
          if (followerIsFollowing === true) {
            nextRelations[uid] = "friend";
          } else if (followingSet.has(uid)) {
            nextRelations[uid] = "outgoing";
          } else if (followerMap.has(uid)) {
            nextRelations[uid] = "incoming";
          } else {
            nextRelations[uid] = "none";
          }
        }
        if (!canceled) setRelationByUid(nextRelations);
      } catch {
        if (!canceled) setRelationByUid({});
      }
    })();

    return () => {
      canceled = true;
    };
  }, [room, idToken, firebaseUser]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!activePopoverPlayerId) return;
      const target = event.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setActivePopoverPlayerId(null);
        setRequestError(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [activePopoverPlayerId]);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) setPlayerName(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const refreshParticipantStatus = async (targetUid: string) => {
    if (!idToken || !firebaseUser || !room) return;

    try {
      const [profileRes, followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/users/${targetUid}/profile`),
        fetch(`${API_BASE}/users/me/friends`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json() as UserProfile;
        setProfilesByUid((prev) => ({ ...prev, [targetUid]: profile }));
      }

      if (!followingRes.ok || !followersRes.ok) return;

      const following = await followingRes.json() as Array<{ uid: string }>;
      const followers = await followersRes.json() as Array<{ uid: string; isFollowing: boolean }>;

      const followingSet = new Set(following.map((friend) => friend.uid));
      const followerMap = new Map(followers.map((follower) => [follower.uid, follower.isFollowing]));

      const followerIsFollowing = followerMap.get(targetUid);
      const nextRelation: FriendRelation =
        followerIsFollowing === true
          ? "friend"
          : followingSet.has(targetUid)
            ? "outgoing"
            : followerMap.has(targetUid)
              ? "incoming"
              : "none";

      setRelationByUid((prev) => ({ ...prev, [targetUid]: nextRelation }));
    } catch {
      // ignore
    }
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!idToken || !targetUid) return;
    setRequestingUid(targetUid);
    setRequestError(null);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${targetUid}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setRequestError(err.error ?? "申請に失敗しました");
        return;
      }
      setRelationByUid((prev) => ({ ...prev, [targetUid]: "outgoing" }));
    } catch {
      setRequestError("申請に失敗しました");
    } finally {
      setRequestingUid(null);
    }
  };

  const approveFriendRequest = async (targetUid: string) => {
    if (!idToken || !targetUid) return;
    setApprovingUid(targetUid);
    setRequestError(null);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${targetUid}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setRequestError(err.error ?? "承認に失敗しました");
        return;
      }
      setRelationByUid((prev) => ({ ...prev, [targetUid]: "friend" }));
    } catch {
      setRequestError("承認に失敗しました");
    } finally {
      setApprovingUid(null);
    }
  };

  const handleParticipantClick = (player: NonNullable<typeof room>["players"][number]) => {
    setRequestError(null);
    setActivePopoverPlayerId((prev) => {
      const next = prev === player.id ? null : player.id;
      if (
        next &&
        idToken &&
        player.userId &&
        player.userId !== firebaseUser?.uid
      ) {
        void refreshParticipantStatus(player.userId);
      }
      return next;
    });
  };

  const renderParticipantAvatar = (player: NonNullable<typeof room>["players"][number]) => {
    const uid = player.userId;
    const profile = uid ? profilesByUid[uid] : null;
    if (profile?.photoURL) {
      return (
        <img
          src={profile.photoURL}
          alt={profile.displayName}
          referrerPolicy="no-referrer"
          style={styles.participantAvatarImage}
        />
      );
    }
    return (
      <span style={styles.participantGuestIcon}>
        <PersonIcon />
      </span>
    );
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
                <span style={styles.codeValue}>{room.code}</span>
                <span style={styles.participantList}>
                  {room.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      style={styles.participantIconBtn}
                      onClick={() => handleParticipantClick(player)}
                      aria-label={`${player.name} の情報を表示`}
                      title={player.name}
                    >
                      {renderParticipantAvatar(player)}
                    </button>
                  ))}
                </span>
              </span>
            </div>
          )}

          {/* Player name pill (always visible when name is set) */}
          {playerName && !editing && (
            <button
              className={canEdit ? "app-header-name" : ""}
              style={{
                ...styles.playerPill,
                cursor: canEdit ? "pointer" : "default",
                border: "none",
                background: styles.playerPill.background,
              }}
              onClick={startEdit}
              disabled={!canEdit}
              title={canEdit ? "クリックで名前を変更" : displayName}
              aria-label={canEdit ? `名前を変更: ${displayName}` : `プレイヤー: ${displayName}`}
            >
              <span style={styles.playerDot} aria-hidden="true" />
              {displayName}
              {canEdit && <span style={styles.editHint} aria-hidden="true">✎</span>}
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

          {/* メニューボタン */}
          <button
            className="app-header-menu-btn"
            style={styles.menuBtn}
            onClick={onMenuClick}
            aria-label="アカウントメニューを開く"
          >
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName ?? "アバター"}
                style={styles.menuAvatar}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span style={styles.menuIcon}>
                <PersonIcon />
              </span>
            )}
          </button>
        </div>
      </div>
      {room && activePlayer && (
        <div ref={popoverRef} style={styles.participantPopover} role="dialog" aria-label="参加者情報">
          <div style={styles.participantPopoverHeader}>
            <span style={styles.participantPopoverAvatar}>
              {renderParticipantAvatar(activePlayer)}
            </span>
            <div style={styles.participantPopoverTextWrap}>
              <div style={styles.participantPopoverNameRow}>
                <div style={styles.participantPopoverName}>
                {activeProfile?.displayName ?? activePlayer.name}
                </div>
                {activeRelation === "friend" && <span style={styles.participantFriendBadge}>フレンド</span>}
              </div>
            </div>
          </div>

          {idToken && activeUid && activeUid !== firebaseUser?.uid && (
            <div style={styles.participantPopoverActionWrap}>
              {activeRelation === "none" && (
                <button
                  type="button"
                  style={styles.participantRequestBtn}
                  onClick={() => void sendFriendRequest(activeUid)}
                  disabled={requestingUid === activeUid}
                >
                  {requestingUid === activeUid ? "申請中..." : "フレンド申請"}
                </button>
              )}
              {activeRelation === "outgoing" && (
                <div style={styles.participantStatusText}>フレンド申請中です</div>
              )}
              {activeRelation === "incoming" && (
                <div style={styles.participantIncomingRow}>
                  <div style={{ ...styles.participantStatusText, flex: 1 }}>相手からフレンド申請が届いています</div>
                  <button
                    type="button"
                    style={styles.participantApproveBtn}
                    onClick={() => void approveFriendRequest(activeUid)}
                    disabled={approvingUid === activeUid}
                  >
                    {approvingUid === activeUid ? "承認中..." : "承認"}
                  </button>
                </div>
              )}
              {requestError && <div style={styles.participantErrorText}>{requestError}</div>}
            </div>
          )}
        </div>
      )}
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
  codeValue: {
    letterSpacing: "0.15em",
  },
  participantList: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginLeft: 2,
  },
  participantIconBtn: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "1px solid rgba(99, 102, 241, 0.35)",
    padding: 0,
    background: "rgba(255, 255, 255, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6366F1",
    overflow: "hidden",
  },
  participantAvatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  participantGuestIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    color: "#6366F1",
  },
  participantPopover: {
    position: "absolute",
    top: 56,
    right: "max(calc(50% - 400px), 16px)",
    width: 280,
    borderRadius: 14,
    border: "1px solid rgba(129, 140, 248, 0.35)",
    background: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 14px 32px rgba(79, 70, 229, 0.2)",
    padding: 12,
    zIndex: 930,
  },
  participantPopoverHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  participantPopoverAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    overflow: "hidden",
    border: "1px solid rgba(99, 102, 241, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6366F1",
    background: "rgba(238, 242, 255, 0.9)",
    flexShrink: 0,
  },
  participantPopoverTextWrap: {
    minWidth: 0,
  },
  participantPopoverNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  participantPopoverName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#3730A3",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  participantPopoverActionWrap: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  participantRequestBtn: {
    minHeight: 36,
    borderRadius: 10,
    border: "none",
    background: "#4F46E5",
    color: "#fff",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  participantStatusText: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#4F46E5",
    background: "rgba(238, 242, 255, 0.9)",
    borderRadius: 10,
    padding: "8px 10px",
  },
  participantFriendBadge: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#166534",
    background: "#ecfdf5",
    border: "1px solid #86efac",
    borderRadius: 999,
    padding: "2px 8px",
    lineHeight: 1.4,
    flexShrink: 0,
  },
  participantIncomingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  participantApproveBtn: {
    minHeight: 34,
    borderRadius: 10,
    border: "none",
    background: "#4F46E5",
    color: "#fff",
    fontSize: "0.78rem",
    fontWeight: 700,
    padding: "7px 10px",
    cursor: "pointer",
    flexShrink: 0,
  },
  participantErrorText: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#DC2626",
    background: "#FEF2F2",
    borderRadius: 10,
    padding: "6px 8px",
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

  /* Menu button */
  menuBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1.5px solid rgba(129, 140, 248, 0.3)",
    background: "rgba(238, 242, 255, 0.8)",
    backdropFilter: "blur(8px)",
    color: "#6366F1",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.08)",
    overflow: "hidden",
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
  },
  menuIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
