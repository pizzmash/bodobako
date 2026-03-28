export const PRESET_ACCENT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#64748b", // slate
] as const;

export const BG_CSS_PATTERNS = [
  "none",
  "dots",
  "stripes",
  "grid",
  "crosshatch",
  "diamonds",
] as const;

// SVGパターンID一覧（新しいSVGを追加するときはここに追記）
export const BG_SVG_PATTERN_IDS = [
  "svg-cat",
] as const;

export type BgSvgPatternId = (typeof BG_SVG_PATTERN_IDS)[number];

// SVGパターンのメタデータ（ラベルとファイル名）
export const BG_SVG_PATTERN_META: Record<BgSvgPatternId, { label: string; file: string }> = {
  "svg-cat": { label: "ねこ", file: "svg-cat.svg" },
};

export const BG_PATTERNS = [...BG_CSS_PATTERNS, ...BG_SVG_PATTERN_IDS] as const;

export type BgPattern = (typeof BG_PATTERNS)[number];

/** pattern が SVG ベースのパターンかどうかを判定する型ガード */
export function isSvgBgPattern(pattern: BgPattern): pattern is BgSvgPatternId {
  return (BG_SVG_PATTERN_IDS as readonly string[]).includes(pattern);
}

export interface PlayerCardStyle {
  accentColor?: string;
  bgPattern?: BgPattern;
}
