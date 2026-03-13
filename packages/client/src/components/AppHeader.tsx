import { getGameDefinition } from "@bodobako/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { MAX_PLAYER_NAME_LENGTH } from "../lib/constants";
import { Z } from "../styles/tokens";
import { API_BASE } from "../lib/socket";
import type { FriendRelation } from "./AppHeader/hooks/useFriendRelations";
import { useFriendRelations } from "./AppHeader/hooks/useFriendRelations";
import { useParticipantProfiles } from "./AppHeader/hooks/useParticipantProfiles";
import { Avatar } from "./ui/Avatar";

const GameIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { room, playerId, playerName, setPlayerName } = useRoom();
  const { firebaseUser, idToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const [activePopoverPlayerId, setActivePopoverPlayerId] = useState<string | null>(null);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const gameDef = room ? getGameDefinition(room.gameId) : null;
  const myPlayer = room?.players.find((p) => p.id === playerId);
  const displayName = myPlayer?.name ?? playerName;

  const [profilesByUid, setProfile] = useParticipantProfiles(room?.players ?? null);
  const { relationByUid, setRelation } = useFriendRelations(
    room?.players ?? null,
    idToken,
    firebaseUser,
  );

  const activePlayer = useMemo(
    () => room?.players.find((p) => p.id === activePopoverPlayerId) ?? null,
    [room, activePopoverPlayerId],
  );
  const activeUid = activePlayer?.userId ?? "";
  const activeProfile = activeUid ? profilesByUid[activeUid] : null;
  const activeRelation: FriendRelation | null = activeUid
    ? (relationByUid[activeUid] ?? "none")
    : null;

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
    const onPointerDown = (event: PointerEvent) => {
      if (!activePopoverPlayerId) return;
      const target = event.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setActivePopoverPlayerId(null);
        setRequestError(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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
        fetch(`${API_BASE}/users/me/friends`, { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch(`${API_BASE}/users/me/followers`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setProfile(targetUid, profile);
      }
      if (!followingRes.ok || !followersRes.ok) return;

      const following = (await followingRes.json()) as Array<{ uid: string }>;
      const followers = (await followersRes.json()) as Array<{
        uid: string;
        isFollowing: boolean;
      }>;
      const followingSet = new Set(following.map((f) => f.uid));
      const followerMap = new Map(followers.map((f) => [f.uid, f.isFollowing]));

      const fi = followerMap.get(targetUid);
      const nextRelation: FriendRelation =
        fi === true
          ? "friend"
          : followingSet.has(targetUid)
            ? "outgoing"
            : followerMap.has(targetUid)
              ? "incoming"
              : "none";
      setRelation(targetUid, nextRelation);
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
        const err = (await res.json()) as { error?: string };
        setRequestError(err.error ?? "申請に失敗しました");
        return;
      }
      setRelation(targetUid, "outgoing");
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
        const err = (await res.json()) as { error?: string };
        setRequestError(err.error ?? "承認に失敗しました");
        return;
      }
      setRelation(targetUid, "friend");
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
      if (next && idToken && player.userId && player.userId !== firebaseUser?.uid) {
        void refreshParticipantStatus(player.userId);
      }
      return next;
    });
  };

  const renderParticipantAvatar = (player: NonNullable<typeof room>["players"][number]) => {
    const uid = player.userId;
    const profile = uid ? profilesByUid[uid] : null;
    return (
      <Avatar
        photoURL={profile?.photoURL}
        displayName={profile?.displayName ?? player.name}
        size={24}
      />
    );
  };

  return (
    <header
      className="sticky top-0 z-header w-full border-b border-indigo-300/20 bg-white/75 font-poppins shadow-[0_4px_16px_rgba(99,102,241,0.08)] backdrop-blur-xl animate-slide-down"
    >
      <div className="relative mx-auto max-w-[800px]">
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5">
          {/* Brand */}
          <div className="flex w-full select-none items-center justify-center gap-2.5 sm:w-auto sm:justify-start" role="heading" aria-level={1}>
            <GameIcon />
            <span className="text-[1.4rem] font-bold tracking-[0.01em] text-indigo-gradient">
              ボド箱
            </span>
          </div>

          {/* Right side */}
          <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
          {/* Room context pills */}
          {room && (
            <div className="flex items-center gap-2.5 animate-slide-down">
              {gameDef && (
                <span
                  className="px-3.5 py-1.5 text-[0.85rem] font-semibold rounded-full text-white whitespace-nowrap min-h-[32px] flex items-center shadow-[0_2px_8px_rgba(99,102,241,0.25),0_0_0_1px_rgba(255,255,255,0.2)_inset] bg-indigo-gradient"
                >
                  {gameDef.name}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-[0.85rem] font-bold rounded-full bg-indigo-50/80 backdrop-blur-sm text-indigo-700 tracking-[0.15em] whitespace-nowrap border-2 border-indigo-300/30 min-h-[32px] shadow-[0_2px_8px_rgba(99,102,241,0.1)]">
                <span className="text-[0.65rem] font-semibold text-violet-400 tracking-[0.1em]">
                  ROOM
                </span>
                <span className="tracking-[0.15em]">{room.code}</span>
                <span className="inline-flex items-center gap-1 ml-0.5">
                  {room.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className="w-6 h-6 p-0 rounded-full border-0 bg-transparent cursor-pointer"
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

          {/* Player name pill */}
          {playerName && !editing && (
            <button
              className={`flex min-h-[32px] items-center gap-2 whitespace-nowrap rounded-full border-none bg-indigo-50/80 px-3.5 py-1.5 text-[0.85rem] font-medium text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.08)] backdrop-blur-sm transition-[background,transform,box-shadow] duration-200 ${canEdit ? "cursor-pointer hover:-translate-y-px hover:bg-indigo-300/15 hover:shadow-[0_2px_8px_rgba(99,102,241,0.15)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500" : "cursor-default"}`}
              onClick={startEdit}
              disabled={!canEdit}
              title={canEdit ? "クリックで名前を変更" : displayName}
              aria-label={canEdit ? `名前を変更: ${displayName}` : `プレイヤー: ${displayName}`}
            >
              <span
                className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]"
                aria-hidden="true"
              />
              {displayName}
              {canEdit && (
                <span className="text-[0.75rem] text-violet-400 ml-1" aria-hidden="true">
                  ✎
                </span>
              )}
            </button>
          )}

          {/* Inline edit */}
          {editing && (
            <input
              ref={inputRef}
              className="px-3.5 py-1.5 text-[0.85rem] rounded-full border-2 border-indigo-500 outline-none w-36 box-border font-poppins text-center min-h-[32px] bg-white/95 backdrop-blur-sm shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              maxLength={MAX_PLAYER_NAME_LENGTH}
              aria-label="プレイヤー名編集"
              type="text"
            />
          )}

          {/* メニューボタン */}
          <button
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-indigo-300/30 bg-indigo-50/80 p-0 text-indigo-500 shadow-[0_2px_8px_rgba(99,102,241,0.08)] backdrop-blur-sm transition-[background,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-indigo-300/15 hover:shadow-[0_2px_8px_rgba(99,102,241,0.2)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            onClick={onMenuClick}
            aria-label="アカウントメニューを開く"
          >
            <Avatar
              displayName={firebaseUser?.displayName ?? playerName}
              photoURL={firebaseUser?.photoURL ?? undefined}
              size={36}
            />
          </button>
          </div>
        </div>

        {/* 参加者ポップオーバー */}
        {room && activePlayer && (
          <div
            ref={popoverRef}
            className="absolute right-4 top-14 w-[280px] rounded-2xl border border-indigo-300/[35%] bg-[rgba(255,255,255,0.98)] p-3 shadow-[0_14px_32px_rgba(79,70,229,0.2)] backdrop-blur-[10px] sm:right-6"
            style={{ zIndex: Z.headerPopover }}
            role="dialog"
            aria-label="参加者情報"
          >
            <div className="flex items-center gap-2.5">
              <Avatar
                photoURL={activeProfile?.photoURL}
                displayName={activeProfile?.displayName ?? activePlayer.name}
                size={38}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[0.9rem] font-bold text-indigo-900">
                    {activeProfile?.displayName ?? activePlayer.name}
                  </div>
                  {activeRelation === "friend" && (
                    <span className="shrink-0 rounded-full border border-green-300 bg-green-50 px-2 py-px text-[0.72rem] font-bold leading-[1.4] text-green-800">
                      フレンド
                    </span>
                  )}
                </div>
              </div>
            </div>
 
            {idToken && activeUid && activeUid !== firebaseUser?.uid && (
              <div className="mt-2.5 flex flex-col gap-2">
                {activeRelation === "none" && (
                  <button
                    type="button"
                    className="min-h-[36px] cursor-pointer rounded-xl border-0 bg-indigo-700 text-[0.82rem] font-bold text-white disabled:opacity-60"
                    onClick={() => void sendFriendRequest(activeUid)}
                    disabled={requestingUid === activeUid}
                  >
                    {requestingUid === activeUid ? "申請中..." : "フレンド申請"}
                  </button>
                )}
                {activeRelation === "outgoing" && (
                  <div className="rounded-xl bg-indigo-50/90 px-2.5 py-2 text-[0.82rem] font-semibold text-indigo-700">
                    フレンド申請中です
                  </div>
                )}
                {activeRelation === "incoming" && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl bg-indigo-50/90 px-2.5 py-2 text-[0.82rem] font-semibold text-indigo-700">
                      相手からフレンド申請が届いています
                    </div>
                    <button
                      type="button"
                      className="min-h-[34px] shrink-0 cursor-pointer rounded-xl border-0 bg-indigo-700 px-2.5 py-[7px] text-[0.78rem] font-bold text-white disabled:opacity-60"
                      onClick={() => void approveFriendRequest(activeUid)}
                      disabled={approvingUid === activeUid}
                    >
                      {approvingUid === activeUid ? "承認中..." : "承認"}
                    </button>
                  </div>
                )}
                {requestError && (
                  <div className="rounded-xl bg-red-50 px-2 py-1.5 text-[0.78rem] font-semibold text-red-600">
                    {requestError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
