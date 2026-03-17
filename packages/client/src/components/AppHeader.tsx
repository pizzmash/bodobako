import { getGameDefinition } from "@bodobako/shared";
import clsx from "clsx";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { useSoundSettings } from "../hooks/useSoundSettings";
import { MAX_PLAYER_NAME_LENGTH } from "../lib/constants";
import { Z } from "../styles/tokens";
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
  const { room, playerName, setPlayerName } = useRoom();
  const { firebaseUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { muted, toggleMute } = useSoundSettings();

  const gameDef = room ? getGameDefinition(room.gameId) : null;
  const isPlaying = room?.status === "playing";

  const canEdit = !room && !firebaseUser;

  const startEdit = () => {
    if (!canEdit) return;
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

  const displayName = playerName;

  return (
    <header
      className="sticky top-0 z-header w-full border-b border-indigo-300/20 bg-white/75 font-poppins shadow-[0_4px_16px_rgba(99,102,241,0.08)] backdrop-blur-xl animate-slide-down"
      style={{ zIndex: Z.header }}
    >
      <div className="relative mx-auto max-w-full">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3.5">
          {/* Brand */}
          <div className="flex select-none items-center gap-2.5" role="heading" aria-level={1}>
            <GameIcon />
            <span className="text-[1.4rem] font-bold tracking-[0.01em] text-indigo-gradient">
              ボド箱
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
          {/* Room context pills - モバイルでは非表示 */}
          {room && (
            <div className="hidden sm:flex items-center gap-2.5 animate-slide-down">
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
              </span>
            </div>
          )}

          {/* 消音ボタン（ゲーム中のみ表示） */}
          {isPlaying && (
            <button
              type="button"
              className={clsx(
                "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] bg-indigo-50/80 p-0 backdrop-blur-sm transition-[background,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-indigo-300/15 hover:shadow-[0_2px_8px_rgba(99,102,241,0.2)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                muted
                  ? "border-red-300/50 text-red-400"
                  : "border-indigo-300/30 text-indigo-500",
              )}
              onClick={toggleMute}
              aria-label={muted ? "消音中（クリックで音を出す）" : "音あり（クリックで消音）"}
              title={muted ? "消音中" : "音あり"}
            >
              {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            </button>
          )}

          {/* Player name pill */}
          {playerName && !editing && (
            <button
              className={clsx(
                "flex min-h-[32px] items-center gap-2 whitespace-nowrap rounded-full border-none bg-indigo-50/80 px-3.5 py-1.5 text-[0.85rem] font-medium text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.08)] backdrop-blur-sm transition-[background,transform,box-shadow] duration-200",
                canEdit
                  ? "cursor-pointer hover:-translate-y-px hover:bg-indigo-300/15 hover:shadow-[0_2px_8px_rgba(99,102,241,0.15)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  : "cursor-default",
              )}
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
      </div>
    </header>
  );
}
