import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "../ui/Avatar";
import { PLAYER_COLORS, withAlpha } from "../../lib/color";

export interface PlayerSlotProps {
  playerId: string;
  isMe: boolean;
  isCurrentPlayer: boolean | null; // null = ターン概念なし（ハイライトなし）
}

interface PlayerCardProps {
  playerId: string;
  playerName: string;
  colorIndex: number;
  /** ゲーム固有の色（指定時は PLAYER_COLORS[colorIndex] より優先） */
  accentColor?: string;
  isMe: boolean;
  isCurrentPlayer: boolean | null;
  /** アバター画像URL（ログイン済みプレイヤー） */
  photoURL?: string;
  /** アバターのフォールバックテキスト */
  avatarDisplayName?: string;
  /** アバタークリック時のコールバック */
  onAvatarClick?: (event: React.MouseEvent) => void;
  children?: ReactNode;
}

export function PlayerCard({
  playerName,
  colorIndex,
  accentColor: accentColorOverride,
  isMe,
  isCurrentPlayer,
  photoURL,
  avatarDisplayName,
  onAvatarClick,
  children,
}: PlayerCardProps) {
  const accentColor = accentColorOverride ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const isCurrent = isCurrentPlayer === true;

  const cardStyle: CSSProperties = {
    borderLeft: `4px solid ${accentColor}`,
    background: withAlpha(accentColor, 0.04),
    boxShadow: isCurrent
      ? `0 0 0 1.5px ${withAlpha(accentColor, 0.5)}, 0 3px 10px ${withAlpha(accentColor, 0.25)}`
      : "0 1px 4px rgba(0,0,0,0.07)",
    ...(isCurrent
      ? {
          animation: "player-card-glow 2s ease-in-out infinite",
          "--card-glow-ring": withAlpha(accentColor, 0.5),
          "--card-glow-shadow": withAlpha(accentColor, 0.25),
        }
      : {}),
  };

  return (
    <div
      className="rounded-xl mb-2 px-3 py-2.5 transition-[box-shadow,transform] duration-300 ease-in-out"
      style={cardStyle}
    >
      {/* 名前行 */}
      <div className="flex items-center gap-2">
        {/* アバター（クリック可能） */}
        <button
          type="button"
          className="p-0 rounded-full border-0 bg-transparent cursor-pointer flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ width: 32, height: 32 }}
          onClick={onAvatarClick}
          aria-label={`${playerName} の情報を表示`}
        >
          <Avatar
            photoURL={photoURL}
            displayName={avatarDisplayName ?? playerName}
            size={32}
          />
        </button>

        {/* プレイヤー名 */}
        <span
          className="text-[0.875rem] font-bold truncate flex-1 leading-tight"
          style={{ color: accentColor }}
        >
          {playerName}
        </span>

        {/* あなたバッジ */}
        {isMe && (
          <span
            className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: withAlpha(accentColor, 0.15),
              color: accentColor,
            }}
          >
            あなた
          </span>
        )}
      </div>

      {/* ゲーム固有コンテンツスロット */}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
