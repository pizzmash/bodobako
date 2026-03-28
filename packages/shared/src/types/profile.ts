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

export const BG_PATTERNS = [
  "none",
  "dots",
  "stripes",
  "grid",
  "crosshatch",
  "diamonds",
] as const;

export type BgPattern = (typeof BG_PATTERNS)[number];

export interface PlayerCardStyle {
  accentColor?: string;
  bgPattern?: BgPattern;
}
