import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import type { GameLogItem } from "../hooks/useGameLog";
import { useIsMobile } from "../hooks/useIsMobile";
import { APP_HEADER_HEIGHT, GAME_SIDEBAR_WIDTH } from "../lib/constants";
import { API_BASE } from "../lib/socket";
import { Z } from "../styles/tokens";
import type { FriendRelation } from "./AppHeader/hooks/useFriendRelations";
import { useFriendRelations } from "./AppHeader/hooks/useFriendRelations";
import { useParticipantProfiles } from "./AppHeader/hooks/useParticipantProfiles";
import { LogPanel } from "./GameSidebar/LogPanel";
import type { PlayerSlotProps } from "./GameSidebar/PlayerCard";
import { PlayerCard } from "./GameSidebar/PlayerCard";
import { Avatar } from "./ui/Avatar";

interface GameSidebarContentProps {
  logEntries: GameLogItem[];
  PlayerSlot?: ComponentType<PlayerSlotProps>;
  currentTurnPlayerId: string | null;
  /** ゲーム固有のプレイヤーカラーマップ（playerId → CSS color） */
  playerColorMap?: Record<string, string>;
  /** ログエントリの追加レンダリング（ゲーム固有のSVG等） */
  renderLogItemExtra?: (item: GameLogItem) => ReactNode;
}

export function GameSidebarContent({
  logEntries,
  PlayerSlot,
  currentTurnPlayerId,
  playerColorMap,
  renderLogItemExtra,
}: GameSidebarContentProps) {
  const { room, playerId, resultPlayers } = useRoom();
  const { firebaseUser, idToken, cardStyle: myCardStyle } = useAuth();
  const isMobile = useIsMobile();

  const [activePopoverPlayerId, setActivePopoverPlayerId] = useState<string | null>(null);
  const [popoverAnchorTop, setPopoverAnchorTop] = useState(0);
  const [requestingUid, setRequestingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [profilesByUid, setProfile] = useParticipantProfiles(room?.players ?? null);
  const { relationByUid, setRelation } = useFriendRelations(
    room?.players ?? null,
    idToken,
    firebaseUser,
  );

  const activePlayer = useMemo(
    () => (resultPlayers ?? room?.players ?? []).find((p) => p.id === activePopoverPlayerId) ?? null,
    [room, resultPlayers, activePopoverPlayerId],
  );
  const activeUid = activePlayer?.userId ?? "";
  const activeProfile = activeUid ? profilesByUid[activeUid] : null;
  const activeRelation: FriendRelation | null = activeUid
    ? (relationByUid[activeUid] ?? "none")
    : null;

  // ポップオーバー外クリックで閉じる
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

  const refreshParticipantStatus = async (targetUid: string) => {
    if (!idToken || !firebaseUser || !room) return;
    try {
      const [profileRes, followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/users/${targetUid}/profile`),
        fetch(`${API_BASE}/users/me/friends`, { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch(`${API_BASE}/users/me/followers`, { headers: { Authorization: `Bearer ${idToken}` } }),
      ]);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setProfile(targetUid, profile);
      }
      if (!followingRes.ok || !followersRes.ok) return;
      const following = (await followingRes.json()) as Array<{ uid: string }>;
      const followers = (await followersRes.json()) as Array<{ uid: string; isFollowing: boolean }>;
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

  const handleAvatarClick = (
    player: NonNullable<typeof room>["players"][number],
    event: React.MouseEvent,
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPopoverAnchorTop(rect.top);
    setRequestError(null);
    setActivePopoverPlayerId((prev) => {
      const next = prev === player.id ? null : player.id;
      if (next && idToken && player.userId && player.userId !== firebaseUser?.uid) {
        void refreshParticipantStatus(player.userId);
      }
      return next;
    });
  };

  if (!room) return null;

  const popoverRight = isMobile ? 8 : GAME_SIDEBAR_WIDTH + 8;
  const popoverTop = Math.max(APP_HEADER_HEIGHT + 8, popoverAnchorTop);

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* プレイヤーリスト */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
          プレイヤー
        </div>
        {(() => {
          const displayPlayers = (room.status === "finished" && resultPlayers) ? resultPlayers : room.players;
          const livePlayers = room.players;
          return displayPlayers.map((player, index) => {
            const isMe = player.id === playerId;
            const isCurrentPlayer =
              currentTurnPlayerId === null ? null : player.id === currentTurnPlayerId;
            const uid = player.userId;
            const profile = uid ? profilesByUid[uid] : null;
            // ゲーム固有カラー > ユーザー設定カラー > デフォルト（PLAYER_COLORS）の順で優先
            const playerCardStyle = isMe ? myCardStyle : (profile?.cardStyle ?? null);
            const accentColorOverride = playerColorMap?.[player.id] ?? playerCardStyle?.accentColor;
            const bgPattern = playerCardStyle?.bgPattern;
            // 自分はFirebase Authのphoto（常に最新）→ プロフィールAPI の順で使用
            const photoURL = isMe
              ? (firebaseUser?.photoURL ?? profile?.photoURL ?? undefined)
              : (profile?.photoURL || undefined);
            const isOnline = room.status !== "finished"
              ? undefined
              : livePlayers.some((p) => p.id === player.id);
            return (
              <PlayerCard
                key={player.id}
                playerId={player.id}
                playerName={player.name}
                colorIndex={index}
                accentColor={accentColorOverride}
                bgPattern={bgPattern}
                isMe={isMe}
                isCurrentPlayer={isCurrentPlayer}
                photoURL={photoURL}
                avatarDisplayName={profile?.displayName ?? player.name}
                onAvatarClick={(e) => handleAvatarClick(player, e)}
                isOnline={isOnline}
              >
                {PlayerSlot && (
                  <PlayerSlot
                    playerId={player.id}
                    isMe={isMe}
                    isCurrentPlayer={isCurrentPlayer}
                  />
                )}
              </PlayerCard>
            );
          });
        })()}
      </div>

      {/* ゲームログ */}
      <div className="flex-1 overflow-y-auto">
        <LogPanel
          logs={logEntries}
          players={room.players}
          playerColorMap={playerColorMap}
          renderLogItemExtra={renderLogItemExtra}
        />
      </div>

      {/* 参加者ポップオーバー */}
      {activePlayer && (
        <div
          ref={popoverRef}
          className="fixed rounded-2xl border border-indigo-300/[35%] bg-[rgba(255,255,255,0.98)] p-3 shadow-[0_14px_32px_rgba(79,70,229,0.2)] backdrop-blur-[10px]"
          style={{
            right: popoverRight,
            top: popoverTop,
            width: isMobile ? "calc(100vw - 16px)" : 260,
            zIndex: Z.gameModal,
          }}
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
  );
}
