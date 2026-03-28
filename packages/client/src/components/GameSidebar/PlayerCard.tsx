import type { BgPattern } from "@bodobako/shared";
import { BG_SVG_PATTERN_META, isSvgBgPattern } from "@bodobako/shared";
import type { CSSProperties, ReactNode } from "react";
import { PLAYER_COLORS, withAlpha } from "../../lib/color";
import { Avatar } from "../ui/Avatar";

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
  /** プレイヤーカード背景パターン */
  bgPattern?: BgPattern;
  isMe: boolean;
  isCurrentPlayer: boolean | null;
  /** アバター画像URL（ログイン済みプレイヤー） */
  photoURL?: string;
  /** アバターのフォールバックテキスト */
  avatarDisplayName?: string;
  /** アバタークリック時のコールバック */
  onAvatarClick?: (event: React.MouseEvent) => void;
  /** false の場合はオフライン（退出済み）表示 */
  isOnline?: boolean;
  children?: ReactNode;
}

function bgPatternStyle(pattern: BgPattern | undefined, color: string): CSSProperties {
  if (!pattern || pattern === "none") return {};
  // SVGパターンはオーバーレイ div で描画するためここでは何もしない
  if (isSvgBgPattern(pattern)) return {};
  const c = withAlpha(color, 0.18);
  switch (pattern) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(${c} 1.5px, transparent 1.5px)`,
        backgroundSize: "12px 12px",
      };
    case "stripes":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1.5px, transparent 0, transparent 50%)`,
        backgroundSize: "10px 10px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
        backgroundSize: "12px 12px",
      };
    case "crosshatch":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`,
        backgroundSize: "10px 10px",
      };
    case "diamonds":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`,
        backgroundSize: "14px 14px",
        backgroundPosition: "0 0, 7px 0",
      };
  }
}

export function PlayerCard({
  playerName,
  colorIndex,
  accentColor: accentColorOverride,
  bgPattern,
  isMe,
  isCurrentPlayer,
  photoURL,
  avatarDisplayName,
  onAvatarClick,
  isOnline,
  children,
}: PlayerCardProps) {
  const accentColor = accentColorOverride ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const isCurrent = isCurrentPlayer === true;

  const cardStyle: CSSProperties = {
    borderLeft: `4px solid ${accentColor}`,
    backgroundColor: withAlpha(accentColor, 0.04),
    boxShadow: isCurrent
      ? `0 0 0 1.5px ${withAlpha(accentColor, 0.5)}, 0 3px 10px ${withAlpha(accentColor, 0.25)}`
      : "0 1px 4px rgba(0,0,0,0.07)",
    ...bgPatternStyle(bgPattern, accentColor),
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
      className={`relative rounded-xl mb-2 px-3 py-2.5 overflow-hidden transition-[box-shadow,transform,opacity] duration-300 ease-in-out${isOnline === false ? " opacity-50" : ""}`}
      style={cardStyle}
    >
      {/* SVGパターンオーバーレイ */}
      {bgPattern && isSvgBgPattern(bgPattern) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('/patterns/${BG_SVG_PATTERN_META[bgPattern].file}')`,
            backgroundSize: "52px 45px",
            backgroundRepeat: "repeat",
            opacity: 0.18,
          }}
          aria-hidden="true"
        />
      )}
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
        {/* 退出済みバッジ */}
        {isOnline === false && (
          <span className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 flex-shrink-0">
            退出済み
          </span>
        )}
      </div>

      {/* ゲーム固有コンテンツスロット */}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
