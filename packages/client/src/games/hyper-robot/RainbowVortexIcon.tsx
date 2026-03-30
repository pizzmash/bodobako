import type { SVGProps } from "react";

/** LucideIcon 互換 props */
interface VortexProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string; // 無視 — 常にレインボーで描画
}

// 内側→外側へ: 紫→青→シアン→緑→黄→赤
const RAINBOW = ["#8B5CF6", "#3B82F6", "#06B6D4", "#22C55E", "#EAB308", "#EF4444"] as const;

/**
 * ブラックホール渦巻アイコン
 * 6本の同心円弧が各60°ずつずれることで螺旋状の渦を形成する。
 * 弧は内→外にいくほど半径が大きく、レインボーカラーで描画される。
 */
export function RainbowVortexIcon({ size = 24, strokeWidth = 1.5 }: VortexProps) {
  const sw = typeof strokeWidth === "number" ? strokeWidth : parseFloat(String(strokeWidth));

  // i番目の弧: 半径 = 2 + i*1.55, 開始角 = i*60°, 掃引 = 240°
  const arcs = Array.from({ length: 6 }, (_, i) => {
    const r = 2 + i * 1.55;
    const startRad = (i * 60) * (Math.PI / 180);
    const endRad = (i * 60 + 240) * (Math.PI / 180);
    const x1 = 12 + r * Math.cos(startRad);
    const y1 = 12 + r * Math.sin(startRad);
    const x2 = 12 + r * Math.cos(endRad);
    const y2 = 12 + r * Math.sin(endRad);
    return { r, x1, y1, x2, y2, color: RAINBOW[i] };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* 外縁の微細グロー */}
      <circle cx="12" cy="12" r="9.5" stroke="url(#rv-outer)" strokeWidth="0.4" opacity="0.35" />

      {/* 渦状アーク（外→内の順で描画し、内側を前面に） */}
      {[...arcs].reverse().map(({ r, x1, y1, x2, y2, color }, ri) => {
        const i = 5 - ri;
        return (
          <path
            key={i}
            d={`M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 1 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`}
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            opacity={0.75 + i * 0.04}
          />
        );
      })}

      {/* 中心コア — ブラックホール特異点 */}
      <circle cx="12" cy="12" r="1.8" fill="#0a0018" />
      <circle cx="12" cy="12" r="1.8" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.6" />
      {/* コアの微細グロー */}
      <circle cx="12" cy="12" r="1.2" fill="#1a0040" />

      <defs>
        <radialGradient id="rv-outer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
        </radialGradient>
      </defs>
    </svg>
  );
}
