import type { BgCssPattern, BgPattern } from "@bodobako/shared";
import { BG_SVG_PATTERN_META, isSvgBgPattern } from "@bodobako/shared";
import type { CSSProperties } from "react";
import { withAlpha } from "./color";

export interface CssPatternStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition?: string;
}

/**
 * CSSパターン（dots/stripes/grid/crosshatch/diamonds）のスタイルを生成する共通関数。
 * opacity は利用側で制御する（PlayerCard: 0.18、プレビュー: 0.25）。
 *
 * @param pattern - CSSパターン種別
 * @param color   - 不透明度 1.0 のベースカラー（withAlpha 前の値）
 * @param opacity - パターンの透明度（デフォルト 0.18）
 */
export function buildCssPatternStyle(
  pattern: BgCssPattern,
  color: string,
  opacity = 0.18,
): CssPatternStyle | null {
  const c = withAlpha(color, opacity);
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
    default:
      return null;
  }
}

/**
 * PlayerCard の cardStyle オブジェクトに展開する形式のパターンスタイルを返す。
 * SVGパターンはオーバーレイ div で描画するため空オブジェクトを返す。
 */
export function bgPatternStyleForCard(
  pattern: BgPattern | undefined,
  color: string,
): CSSProperties {
  if (!pattern || pattern === "none") return {};
  if (isSvgBgPattern(pattern)) return {};
  return buildCssPatternStyle(pattern, color, 0.18) ?? {};
}

/**
 * SVGパターンオーバーレイ div のインラインスタイルを返す。
 */
export function svgPatternOverlayStyle(pattern: BgPattern): CSSProperties | null {
  if (!isSvgBgPattern(pattern)) return null;
  const meta = BG_SVG_PATTERN_META[pattern];
  return {
    backgroundImage: `url('/patterns/${meta.file}')`,
    backgroundSize: meta.size,
    backgroundRepeat: "repeat",
    opacity: 0.18,
  };
}
