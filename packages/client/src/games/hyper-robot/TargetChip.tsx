import type { LucideIcon } from "lucide-react";
import { RAINBOW_COIN_BG, TARGET_COLORS } from "./constants";

interface TargetChipProps {
  Icon: LucideIcon;
  /** TARGET_COLORS[targetColor] */
  color: string;
  size?: number;
}

/**
 * ターゲットチップのリッチコイン表示。
 * rainbow カラーのみレインボーホログラフィック、それ以外はターゲット色。
 */
export function TargetChip({ Icon, color, size = 17 }: TargetChipProps) {
  const isRainbow = color === TARGET_COLORS.rainbow;
  const iconSize = Math.round(size * 0.42);
  const inset = Math.round(size * 0.15);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: isRainbow
          ? RAINBOW_COIN_BG
          : `radial-gradient(circle at 36% 30%, ${color}ff, ${color}cc 42%, ${color}77 68%, ${color}33)`,
        boxShadow: [
          "0 2px 5px rgba(0,0,0,0.55)",
          "inset 0 1.5px 4px rgba(255,255,255,0.28)",
          "inset 0 -1.5px 3px rgba(0,0,0,0.35)",
        ].join(", "),
        border: isRainbow
          ? "1.5px solid rgba(255,255,255,0.52)"
          : `1.5px solid ${color}aa`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* 内側エンボスリング */}
      <div
        style={{
          position: "absolute",
          inset,
          borderRadius: "50%",
          border: isRainbow
            ? "0.5px solid rgba(255,255,255,0.3)"
            : "0.5px solid rgba(255,255,255,0.15)",
          pointerEvents: "none",
        }}
      />
      {/* 彫刻アイコン */}
      <Icon size={iconSize} color="rgba(0,0,0,0.65)" strokeWidth={2.5} />
      {/* スペキュラハイライト */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "16%",
          width: "32%",
          height: "22%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.42)",
          transform: "rotate(-22deg)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
