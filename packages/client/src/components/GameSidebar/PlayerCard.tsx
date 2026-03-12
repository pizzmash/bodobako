import type { ReactNode } from "react";
import { PLAYER_COLORS } from "../../lib/color";
import { withAlpha } from "../../lib/color";

export interface PlayerSlotProps {
  playerId: string;
  isMe: boolean;
  isCurrentPlayer: boolean | null; // null = ターン概念なし（ドット非表示）
}

interface PlayerCardProps {
  playerId: string;
  playerName: string;
  colorIndex: number;
  isMe: boolean;
  isCurrentPlayer: boolean | null;
  children?: ReactNode;
}

export function PlayerCard({
  playerId: _playerId,
  playerName,
  colorIndex,
  isMe,
  isCurrentPlayer,
  children,
}: PlayerCardProps) {
  const accentColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const bgColor = withAlpha(accentColor, 0.07);
  const borderColor = withAlpha(accentColor, 0.3);

  return (
    <div
      className="rounded-xl p-3 mb-2"
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
      }}
    >
      <div className="flex items-center gap-2">
        {/* 手番ドット */}
        {isCurrentPlayer === true && (
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: accentColor }}
          />
        )}
        {isCurrentPlayer === false && (
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 opacity-0" />
        )}
        {/* プレイヤー名 */}
        <span
          className="text-sm font-bold truncate flex-1"
          style={{ color: accentColor }}
        >
          {playerName}
        </span>
        {/* (あなた) ラベル */}
        {isMe && (
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
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
