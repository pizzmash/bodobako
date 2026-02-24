import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../lib/socket";

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const INJECTED_STYLES = `
@keyframes sidebar-overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes sidebar-slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-overlay, .sidebar-drawer {
    animation: none !important;
    transition: none !important;
  }
}

.sidebar-main-tab {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-main-tab:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
}

.sidebar-sign-in-btn {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-sign-in-btn:hover {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}
.sidebar-sign-in-btn:active { transform: translateY(0); }
.sidebar-sign-in-btn:focus { outline: 3px solid #6366F1; outline-offset: 2px; }

.sidebar-sign-out-btn {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-sign-out-btn:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: #EF4444 !important;
  color: #EF4444 !important;
}
.sidebar-sign-out-btn:focus { outline: 3px solid #EF4444; outline-offset: 2px; }

.sidebar-save-btn {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-save-btn:hover:not(:disabled) {
  background: #4F46E5 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.sidebar-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sidebar-save-btn:focus { outline: 3px solid #6366F1; outline-offset: 2px; }

.sidebar-name-input:focus {
  outline: 2px solid #6366F1;
  outline-offset: 0;
  border-color: #6366F1 !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
}

.sidebar-copy-btn {
  transition: background .15s ease, transform .1s ease;
  cursor: pointer;
}
.sidebar-copy-btn:hover { background: rgba(99, 102, 241, 0.12) !important; }
.sidebar-copy-btn:active { transform: scale(.92); }
.sidebar-copy-btn:focus { outline: 2px solid #6366F1; outline-offset: 2px; }

.sidebar-friend-add-btn {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-friend-add-btn:hover:not(:disabled) {
  background: #4F46E5 !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.sidebar-friend-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sidebar-friend-add-btn:focus { outline: 3px solid #6366F1; outline-offset: 2px; }

.sidebar-friend-code-input:focus {
  outline: 2px solid #6366F1;
  outline-offset: 0;
  border-color: #6366F1 !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
}

.sidebar-friend-item {
  transition: background .15s ease;
}
.sidebar-friend-item:hover { background: rgba(238, 242, 255, 0.8) !important; }

.sidebar-remove-btn {
  transition: all .15s ease;
  cursor: pointer;
}
.sidebar-remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1) !important;
  color: #EF4444 !important;
}
.sidebar-remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sidebar-remove-btn:focus { outline: 2px solid #EF4444; outline-offset: 2px; }

.sidebar-follow-back-btn {
  transition: all .15s ease;
  cursor: pointer;
}
.sidebar-follow-back-btn:hover:not(:disabled) {
  background: #4F46E5 !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
.sidebar-follow-back-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sidebar-follow-back-btn:focus { outline: 2px solid #6366F1; outline-offset: 2px; }

.sidebar-sub-tab {
  transition: all .2s ease;
  cursor: pointer;
}
.sidebar-sub-tab:focus { outline: 2px solid #6366F1; outline-offset: 2px; }
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "sidebar-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = INJECTED_STYLES;
    document.head.appendChild(tag);
    return () => { document.getElementById(id)?.remove(); };
  }, []);
}

interface Friend {
  uid: string;
  displayName: string;
  friendCode: string;
  photoURL: string;
}

interface Follower extends Friend {
  isFollowing: boolean;
}

// ミニアバター（Google 画像 or イニシャル）
function Avatar({ photoURL, displayName, size = 36 }: { photoURL: string; displayName: string; size?: number }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        referrerPolicy="no-referrer"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "1.5px solid rgba(129, 140, 248, 0.25)",
        }}
      />
    );
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      fontWeight: 700,
      flexShrink: 0,
      fontFamily: FONT,
    }}>
      {displayName[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// スピナー
function Spinner({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${color}40`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      flexShrink: 0,
    }} aria-hidden="true" />
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  useInjectStyles();
  const { firebaseUser, idToken, appDisplayName, friendCode, isAuthLoading, isProfileLoading, signInWithGoogle, signOut, updateDisplayName } = useAuth();

  // メインタブ
  const [activeTab, setActiveTab] = useState<"account" | "friends">("account");

  // アカウントタブ
  const [nameDraft, setNameDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // フレンドタブ
  const [friendsSubTab, setFriendsSubTab] = useState<"mutual" | "outgoing" | "incoming">("mutual");
  const [following, setFollowing] = useState<Friend[] | null>(null);
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);

  // フレンド追加フォーム
  const [addCode, setAddCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [cancelingUid, setCancelingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);

  const mutualFriends = useMemo(
    () => (followers ?? []).filter((follower) => follower.isFollowing),
    [followers],
  );

  const outgoingRequests = useMemo(() => {
    const followersSet = new Set((followers ?? []).map((follower) => follower.uid));
    return (following ?? []).filter((friend) => !followersSet.has(friend.uid));
  }, [following, followers]);

  const incomingRequests = useMemo(
    () => (followers ?? []).filter((follower) => !follower.isFollowing),
    [followers],
  );

  // フォロー中を読み込む
  const loadFollowing = useCallback(async () => {
    if (!idToken) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setFollowing(await res.json() as Friend[]);
    } catch { /* ignore */ } finally { setFollowingLoading(false); }
  }, [idToken]);

  // フォロワーを読み込む
  const loadFollowers = useCallback(async () => {
    if (!idToken) return;
    setFollowersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/followers`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setFollowers(await res.json() as Follower[]);
    } catch { /* ignore */ } finally { setFollowersLoading(false); }
  }, [idToken]);

  // フレンドタブを開いたとき or ログイン時に両方ロード
  useEffect(() => {
    if (isOpen && activeTab === "friends" && firebaseUser && idToken) {
      void loadFollowing();
      void loadFollowers();
    }
    if (!firebaseUser) { setFollowing(null); setFollowers(null); }
  }, [isOpen, activeTab, firebaseUser, idToken, loadFollowing, loadFollowers]);

  useEffect(() => {
    if (appDisplayName !== null) setNameDraft(appDisplayName);
  }, [appDisplayName]);

  useEffect(() => {
    if (isOpen && firebaseUser && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, firebaseUser]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---- ハンドラ ----

  const handleCopy = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
    } catch {
      const el = document.createElement("textarea");
      el.value = friendCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === appDisplayName) return;
    setSaveError(null); setSaveSuccess(false); setIsSaving(true);
    try {
      await updateDisplayName(trimmed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally { setIsSaving(false); }
  };

  const handleAddFriend = async () => {
    const code = addCode.replace(/-/g, "").trim().toUpperCase();
    if (code.length !== 8) {
      setAddError("フレンドコードは8文字で入力してください（例: ABCD-EFGH）");
      return;
    }
    if (!idToken) return;
    setIsAdding(true); setAddError(null); setAddSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ friendCode: code }),
      });
      if (!res.ok) {
        setAddError(((await res.json()) as { error: string }).error ?? "追加に失敗しました");
      } else {
        const friend = await res.json() as Friend;
        setAddSuccess(friend.displayName);
        setAddCode("");
        setFollowing((prev) => (prev ? [friend, ...prev] : [friend]));
        // 申請一覧の isFollowing も更新
        setFollowers((prev) =>
          prev?.map((f) => f.uid === friend.uid ? { ...f, isFollowing: true } : f) ?? null
        );
        setTimeout(() => setAddSuccess(null), 3000);
      }
    } catch { setAddError("ネットワークエラーが発生しました"); }
    finally { setIsAdding(false); }
  };

  const handleRemove = async (uid: string) => {
    if (!idToken) return;
    setRemovingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends/${uid}/mutual`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowing((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
        setFollowers((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      }
    } catch { /* ignore */ }
    finally { setRemovingUid(null); }
  };

  const handleCancelRequest = async (uid: string) => {
    if (!idToken) return;
    setCancelingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowing((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      }
    } catch { /* ignore */ }
    finally { setCancelingUid(null); }
  };

  const handleApproveRequest = async (follower: Follower) => {
    if (!idToken) return;
    setApprovingUid(follower.uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${follower.uid}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const friend: Friend = {
          uid: follower.uid,
          displayName: follower.displayName,
          friendCode: follower.friendCode,
          photoURL: follower.photoURL,
        };
        setFollowing((prev) => {
          const current = prev ?? [];
          if (current.some((f) => f.uid === friend.uid)) return current;
          return [friend, ...current];
        });
        setFollowers((prev) =>
          prev?.map((f) => f.uid === follower.uid ? { ...f, isFollowing: true } : f) ?? null
        );
      }
    } catch { /* ignore */ }
    finally { setApprovingUid(null); }
  };

  const handleRejectRequest = async (uid: string) => {
    if (!idToken) return;
    setRejectingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${uid}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowers((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      }
    } catch { /* ignore */ }
    finally { setRejectingUid(null); }
  };

  const isLoading = isAuthLoading || isProfileLoading;
  const isDirty = nameDraft.trim() !== "" && nameDraft.trim() !== appDisplayName;

  // ---- レンダリングヘルパー ----

  function renderMutualFriendsList() {
    if (followingLoading) return (
      <div style={s.centeredRow}>
        <Spinner size={18} color="#6366F1" />
        <span style={s.loadingText}>読み込み中...</span>
      </div>
    );
    if (mutualFriends.length === 0) return (
      <div style={s.emptyState}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity: 0.35, marginBottom: 8 }}>
          <circle cx="9" cy="8" r="3.5" stroke="#818CF8" strokeWidth="1.5"/>
          <path d="M2 20c0-3.5 3.13-6 7-6" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17" y1="11" x2="17" y2="17" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="14" y1="14" x2="20" y2="14" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p style={s.emptyTitle}>まだフレンドがいません</p>
        <p style={s.emptySubTitle}>申請を承認するとフレンドになります</p>
      </div>
    );
    return (
      <ul style={s.list} aria-label="フレンド一覧">
        {mutualFriends.map((f) => (
          <li key={f.uid} className="sidebar-friend-item" style={s.friendItem}>
            <Avatar photoURL={f.photoURL} displayName={f.displayName} />
            <div style={s.friendInfo}>
              <span style={s.friendName}>{f.displayName}</span>
              <span style={s.friendCode}>{f.friendCode.slice(0, 4)}-{f.friendCode.slice(4)}</span>
            </div>
            <button
              className="sidebar-remove-btn"
              style={s.iconBtn}
              onClick={() => void handleRemove(f.uid)}
              disabled={removingUid === f.uid}
              aria-label={`${f.displayName} をフレンド削除`}
              title="フレンド削除"
            >
              {removingUid === f.uid
                ? <Spinner size={14} color="#94A3B8" />
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
              }
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function renderOutgoingRequestsList() {
    if (followingLoading || followersLoading) return (
      <div style={s.centeredRow}>
        <Spinner size={18} color="#6366F1" />
        <span style={s.loadingText}>読み込み中...</span>
      </div>
    );
    if (outgoingRequests.length === 0) return (
      <div style={s.emptyState}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity: 0.35, marginBottom: 8 }}>
          <circle cx="12" cy="8" r="4" stroke="#818CF8" strokeWidth="1.5"/>
          <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p style={s.emptyTitle}>申請中のユーザーはいません</p>
        <p style={s.emptySubTitle}>フレンドコードで申請できます</p>
      </div>
    );
    return (
      <ul style={s.list} aria-label="申請中一覧">
        {outgoingRequests.map((f) => (
          <li key={f.uid} className="sidebar-friend-item" style={s.friendItem}>
            <Avatar photoURL={f.photoURL} displayName={f.displayName} />
            <div style={s.friendInfo}>
              <span style={s.friendName}>{f.displayName}</span>
              <span style={s.friendCode}>{f.friendCode.slice(0, 4)}-{f.friendCode.slice(4)}</span>
            </div>
            <button
              className="sidebar-remove-btn"
              style={s.iconBtn}
              onClick={() => void handleCancelRequest(f.uid)}
              disabled={cancelingUid === f.uid}
              aria-label={`${f.displayName} への申請を取り下げ`}
              title="申請取り下げ"
            >
              {cancelingUid === f.uid
                ? <Spinner size={14} color="#94A3B8" />
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
              }
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function renderIncomingRequestsList() {
    if (followersLoading) return (
      <div style={s.centeredRow}>
        <Spinner size={18} color="#6366F1" />
        <span style={s.loadingText}>読み込み中...</span>
      </div>
    );
    if (incomingRequests.length === 0) return (
      <div style={s.emptyState}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity: 0.35, marginBottom: 8 }}>
          <circle cx="12" cy="8" r="4" stroke="#818CF8" strokeWidth="1.5"/>
          <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <p style={s.emptyTitle}>承認待ちの申請はありません</p>
        <p style={s.emptySubTitle}>申請が届くとここに表示されます</p>
      </div>
    );
    return (
      <ul style={s.list} aria-label="承認待ち一覧">
        {incomingRequests.map((f) => (
          <li key={f.uid} className="sidebar-friend-item" style={s.friendItem}>
            <Avatar photoURL={f.photoURL} displayName={f.displayName} />
            <div style={s.friendInfo}>
              <span style={s.friendName}>{f.displayName}</span>
              <span style={s.friendCode}>{f.friendCode.slice(0, 4)}-{f.friendCode.slice(4)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="sidebar-follow-back-btn"
                style={s.followBackBtn}
                onClick={() => void handleApproveRequest(f)}
                disabled={approvingUid === f.uid}
                aria-label={`${f.displayName} の申請を承認`}
                title="承認"
              >
                {approvingUid === f.uid && <Spinner size={12} color="#fff" />}
                承認
              </button>
              <button
                className="sidebar-remove-btn"
                style={s.iconBtn}
                onClick={() => void handleRejectRequest(f.uid)}
                disabled={rejectingUid === f.uid}
                aria-label={`${f.displayName} の申請を拒否`}
                title="拒否"
              >
                {rejectingUid === f.uid
                  ? <Spinner size={14} color="#94A3B8" />
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                }
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- JSX ----

  return (
    <>
      <div className="sidebar-overlay" style={s.overlay} onClick={onClose} aria-hidden="true" />
      <aside className="sidebar-drawer" style={s.drawer} role="dialog" aria-label="アカウントメニュー">

        {/* ドロワーヘッダー */}
        <div style={s.drawerHeader}>
          <span style={s.drawerTitle}>メニュー</span>
          <button style={s.closeBtn} onClick={onClose} aria-label="メニューを閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* メインタブバー */}
        {!isLoading && firebaseUser && (
          <div style={s.tabBar}>
            {(["account", "friends"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  className="sidebar-main-tab"
                  style={{
                    ...s.mainTab,
                    background: active ? "#fff" : "transparent",
                    color: active ? "#4F46E5" : "#94A3B8",
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? "0 2px 8px rgba(99,102,241,0.15)" : "none",
                  }}
                  onClick={() => setActiveTab(tab)}
                  aria-selected={active}
                  role="tab"
                >
                  {tab === "account" ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
                      </svg>
                      アカウント
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3-6 7-6" />
                        <circle cx="17" cy="10" r="3" /><path d="M13.5 20c0-3 2.7-5.5 6.5-5.5" />
                      </svg>
                      フレンド
                      {mutualFriends.length > 0 && (
                        <span style={s.tabBadge}>{mutualFriends.length}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ボディ */}
        <div style={s.drawerBody}>
          {isLoading ? (
            <div style={s.centeredCol} aria-live="polite">
              <div style={s.spinner} aria-hidden="true" />
              <span style={s.loadingText}>読み込み中...</span>
            </div>
          ) : !firebaseUser ? (
            /* 未ログイン */
            <div style={s.section}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }} aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#818CF8" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={s.guestText}>ログインするとプロフィールとフレンド機能が使えます</p>
              <button className="sidebar-sign-in-btn" style={s.signInBtn} onClick={signInWithGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Googleでサインイン
              </button>
            </div>

          ) : activeTab === "account" ? (
            /* ─── アカウントタブ ─── */
            <>
              <div style={s.section}>
                <div style={s.userRow}>
                  <Avatar photoURL={firebaseUser.photoURL ?? ""} displayName={firebaseUser.displayName ?? firebaseUser.email ?? "?"} size={48} />
                  <div style={s.userInfo}>
                    <div style={s.userName}>{firebaseUser.displayName}</div>
                    <div style={s.userEmail}>{firebaseUser.email}</div>
                  </div>
                </div>
              </div>

              <div style={s.divider} />

              <div style={s.section}>
                <label style={s.fieldLabel} htmlFor="sidebar-display-name">アプリ表示名</label>
                <input
                  id="sidebar-display-name"
                  ref={inputRef}
                  className="sidebar-name-input"
                  style={s.nameInput}
                  value={nameDraft}
                  onChange={(e) => { setNameDraft(e.target.value); setSaveError(null); setSaveSuccess(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
                  maxLength={20}
                  placeholder="表示名を入力..."
                  type="text"
                />
                {saveError && <p style={s.errorText} role="alert">{saveError}</p>}
                {saveSuccess && <p style={s.successText} role="status">保存しました</p>}
                <button
                  className="sidebar-save-btn"
                  style={s.saveBtn}
                  onClick={() => void handleSave()}
                  disabled={!isDirty || isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving ? "保存中..." : "保存する"}
                </button>
              </div>

              <div style={s.divider} />

              {friendCode && (
                <div style={s.section}>
                  <div style={s.fieldLabel}>フレンドコード</div>
                  <div style={s.codeRow}>
                    <span style={s.codeText} aria-label={`フレンドコード: ${friendCode}`}>
                      {friendCode.slice(0, 4)}-{friendCode.slice(4)}
                    </span>
                    <button
                      className="sidebar-copy-btn"
                      style={s.copyBtn}
                      onClick={() => void handleCopy()}
                      aria-label={copied ? "コピーしました" : "フレンドコードをコピー"}
                    >
                      {copied
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      }
                    </button>
                  </div>
                  {copied && <p style={s.copiedText} role="status">クリップボードにコピーしました</p>}
                </div>
              )}

              <div style={s.divider} />

              <div style={s.section}>
                <button className="sidebar-sign-out-btn" style={s.signOutBtn} onClick={signOut}>
                  サインアウト
                </button>
              </div>
            </>

          ) : (
            /* ─── フレンドタブ ─── */
            <div style={s.section}>
              {/* フレンド追加フォーム */}
              <div style={s.fieldLabel}>フレンド申請</div>
              <div style={s.addRow}>
                <input
                  className="sidebar-friend-code-input"
                  style={s.codeInput}
                  value={addCode}
                  onChange={(e) => { setAddCode(e.target.value); setAddError(null); setAddSuccess(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAddFriend(); }}
                  placeholder="ABCD-EFGH"
                  maxLength={9}
                  type="text"
                  aria-label="追加するフレンドのコード"
                />
                <button
                  className="sidebar-friend-add-btn"
                  style={s.addBtn}
                  onClick={() => void handleAddFriend()}
                  disabled={isAdding || addCode.trim() === ""}
                  aria-busy={isAdding}
                >
                  {isAdding ? <Spinner size={13} color="#fff" /> : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                  申請
                </button>
              </div>
              {addError && <p style={s.errorText} role="alert">{addError}</p>}
              {addSuccess && (
                <p style={s.successText} role="status">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}><polyline points="20 6 9 17 4 12" /></svg>
                  {addSuccess} に申請しました
                </p>
              )}

              {/* サブタブ */}
              <div style={s.subTabBar}>
                {(["mutual", "outgoing", "incoming"] as const).map((tab) => {
                  const active = friendsSubTab === tab;
                  const count =
                    tab === "mutual"
                      ? mutualFriends.length
                      : tab === "outgoing"
                        ? outgoingRequests.length
                        : incomingRequests.length;
                  return (
                    <button
                      key={tab}
                      className="sidebar-sub-tab"
                      style={{
                        ...s.subTab,
                        background: active ? "#6366F1" : "rgba(238,242,255,0.7)",
                        color: active ? "#fff" : "#818CF8",
                        fontWeight: active ? 700 : 500,
                        boxShadow: active ? "0 2px 8px rgba(99,102,241,0.25)" : "none",
                      }}
                      onClick={() => setFriendsSubTab(tab)}
                      aria-selected={active}
                      role="tab"
                    >
                      {tab === "mutual" ? "フレンド" : tab === "outgoing" ? "申請中" : "承認待ち"}
                      {count > 0 && (
                        <span style={{
                          ...s.subTabBadge,
                          background: active ? "rgba(255,255,255,0.25)" : "rgba(99,102,241,0.15)",
                          color: active ? "#fff" : "#6366F1",
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* リスト */}
              <div style={{ marginTop: 14 }}>
                {friendsSubTab === "mutual"
                  ? renderMutualFriendsList()
                  : friendsSubTab === "outgoing"
                    ? renderOutgoingRequestsList()
                    : renderIncomingRequestsList()}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── スタイル定義 ───────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(15, 10, 40, 0.45)",
    backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
    zIndex: 1090, animation: "sidebar-overlayIn .25s ease",
  },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: 320, maxWidth: "90vw",
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderLeft: "1px solid rgba(129,140,248,0.25)",
    boxShadow: "-8px 0 40px rgba(99,102,241,0.15)",
    zIndex: 1100, display: "flex", flexDirection: "column",
    fontFamily: FONT, animation: "sidebar-slideIn .28s ease-out",
  },
  drawerHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 20px 14px",
    borderBottom: "1px solid rgba(129,140,248,0.12)",
  },
  drawerTitle: {
    fontSize: "1.05rem", fontWeight: 700,
    background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  closeBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36, borderRadius: "50%", border: "none",
    background: "rgba(129,140,248,0.1)", color: "#6366F1",
    cursor: "pointer", transition: "background .15s ease", padding: 0,
  },

  /* メインタブバー */
  tabBar: {
    display: "flex", gap: 4,
    background: "rgba(238,242,255,0.7)",
    borderRadius: 12, padding: 4, margin: "12px 16px 0",
  },
  mainTab: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "9px 0", borderRadius: 9, border: "none",
    fontSize: "0.85rem", fontFamily: FONT, cursor: "pointer",
    transition: "all .2s ease",
  },
  tabBadge: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 18, height: 18, borderRadius: 9,
    background: "rgba(99,102,241,0.15)", color: "#6366F1",
    fontSize: "0.7rem", fontWeight: 700, padding: "0 5px",
  },

  drawerBody: { flex: 1, overflowY: "auto", padding: "8px 0" },

  /* ローディング */
  centeredCol: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "48px 20px", gap: 12,
  },
  centeredRow: {
    display: "flex", alignItems: "center",
    padding: "20px 0", gap: 10, color: "#818CF8",
  },
  spinner: {
    width: 32, height: 32,
    border: "3px solid rgba(99,102,241,0.2)",
    borderTop: "3px solid #6366F1",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: "0.85rem", color: "#818CF8", fontWeight: 500 },

  /* レイアウト共通 */
  section: { padding: "14px 20px" },
  divider: { height: 1, background: "rgba(129,140,248,0.12)", margin: "0 20px" },
  fieldLabel: {
    display: "block", fontSize: "0.75rem", fontWeight: 600,
    color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
  },

  /* 未ログイン */
  guestText: {
    fontSize: "0.85rem", color: "#818CF8", textAlign: "center",
    marginBottom: 20, lineHeight: 1.6,
  },
  signInBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    gap: 10, padding: "12px 0", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff", fontSize: "0.95rem", fontWeight: 600, fontFamily: FONT,
    boxShadow: "0 4px 12px rgba(99,102,241,0.3)", minHeight: 48,
  },

  /* ユーザー情報 */
  userRow: { display: "flex", alignItems: "center", gap: 14 },
  userInfo: { minWidth: 0 },
  userName: {
    fontSize: "0.95rem", fontWeight: 600, color: "#312E81",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  userEmail: {
    fontSize: "0.78rem", color: "#818CF8", marginTop: 2,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },

  /* 表示名 */
  nameInput: {
    width: "100%", padding: "10px 14px", fontSize: "0.95rem",
    borderRadius: 10, border: "1.5px solid rgba(129,140,248,0.3)", outline: "none",
    boxSizing: "border-box", fontFamily: FONT, color: "#4F46E5", fontWeight: 500,
    background: "rgba(238,242,255,0.4)", transition: "border-color .2s, box-shadow .2s",
  },
  errorText: { fontSize: "0.8rem", color: "#EF4444", marginTop: 6, marginBottom: 0 },
  successText: { fontSize: "0.8rem", color: "#22C55E", marginTop: 6, marginBottom: 0, fontWeight: 500 },
  saveBtn: {
    width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
    background: "#6366F1", color: "#fff", fontSize: "0.9rem", fontWeight: 600,
    fontFamily: FONT, marginTop: 12, minHeight: 44,
  },

  /* フレンドコード */
  codeRow: {
    display: "flex", alignItems: "center", gap: 8, marginTop: 6,
    background: "rgba(238,242,255,0.6)", border: "1.5px solid rgba(129,140,248,0.25)",
    borderRadius: 10, padding: "8px 12px",
  },
  codeText: {
    flex: 1, fontFamily: "'Courier New','Consolas',monospace",
    fontSize: "1.05rem", fontWeight: 700, color: "#4F46E5",
    letterSpacing: "0.12em", userSelect: "all",
  },
  copyBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 6, border: "none",
    background: "transparent", color: "#818CF8", padding: 0, flexShrink: 0, cursor: "pointer",
  },
  copiedText: { fontSize: "0.78rem", color: "#22C55E", marginTop: 6, marginBottom: 0, fontWeight: 500 },

  /* サインアウト */
  signOutBtn: {
    width: "100%", padding: "10px 0", borderRadius: 10,
    border: "1.5px solid rgba(239,68,68,0.3)", background: "transparent",
    color: "#EF4444", fontSize: "0.9rem", fontWeight: 600, fontFamily: FONT, minHeight: 44,
  },

  /* フレンドタブ内: 追加フォーム */
  addRow: { display: "flex", gap: 8, alignItems: "center" },
  codeInput: {
    flex: 1, padding: "9px 12px", fontSize: "0.9rem", borderRadius: 10,
    border: "1.5px solid rgba(129,140,248,0.3)", outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "'Courier New','Consolas',monospace",
    color: "#4F46E5", fontWeight: 600,
    background: "rgba(238,242,255,0.4)", letterSpacing: "0.06em",
    transition: "border-color .2s, box-shadow .2s",
  },
  addBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "9px 14px", borderRadius: 10, border: "none",
    background: "#6366F1", color: "#fff",
    fontSize: "0.85rem", fontWeight: 600, fontFamily: FONT,
    minHeight: 40, minWidth: 64, justifyContent: "center", flexShrink: 0,
  },

  /* サブタブ */
  subTabBar: { display: "flex", gap: 8, marginTop: 18 },
  subTab: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 14px", borderRadius: 20, border: "none",
    fontSize: "0.82rem", fontFamily: FONT, cursor: "pointer",
    transition: "all .2s ease",
  },
  subTabBadge: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px",
    fontSize: "0.68rem", fontWeight: 700,
  },

  /* フレンドリスト */
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  friendItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 10,
    background: "rgba(238,242,255,0.5)",
    border: "1px solid rgba(129,140,248,0.15)",
    transition: "background .15s ease",
  },
  friendInfo: { flex: 1, minWidth: 0 },
  friendName: {
    display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#312E81",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  friendCode: {
    display: "block", fontFamily: "'Courier New','Consolas',monospace",
    fontSize: "0.72rem", color: "#A5B4FC", letterSpacing: "0.08em", marginTop: 2,
  },
  iconBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 8, border: "none",
    background: "transparent", color: "#CBD5E1", padding: 0, flexShrink: 0,
  },
  followBackBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "5px 10px", borderRadius: 8, border: "none",
    background: "#6366F1", color: "#fff",
    fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
    minHeight: 30, flexShrink: 0, cursor: "pointer",
    transition: "all .15s ease",
  },
  followingBadge: {
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "4px 8px", borderRadius: 8,
    background: "rgba(34,197,94,0.1)",
    color: "#16A34A", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0,
  },

  /* エンプティステート */
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "20px 0 8px",
  },
  emptyTitle: { fontSize: "0.85rem", color: "#6366F1", fontWeight: 600, margin: 0, textAlign: "center" },
  emptySubTitle: {
    fontSize: "0.78rem", color: "#A5B4FC", marginTop: 4, marginBottom: 0,
    textAlign: "center", lineHeight: 1.5,
  },
};
