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
// IDは "svg-patternXXXX" 形式（XXXX は4桁ゼロ埋め）
export const BG_SVG_PATTERN_IDS = [
  "svg-pattern0451",
  "svg-pattern0455",
  "svg-pattern0461",
  "svg-pattern0476",
  "svg-pattern0477",
  "svg-pattern0489",
  "svg-pattern0490",
  "svg-pattern0499",
  "svg-pattern0507",
  "svg-pattern0517",
  "svg-pattern0527",
  "svg-pattern0539",
  "svg-pattern0563",
  "svg-pattern0586",
  "svg-pattern0589",
  "svg-pattern0590",
  "svg-pattern0595",
  "svg-pattern0597",
  "svg-pattern0598",
  "svg-pattern0609",
  "svg-pattern0611",
  "svg-pattern0617",
  "svg-pattern0634",
  "svg-pattern0636",
  "svg-pattern0638",
] as const;

export type BgSvgPatternId = (typeof BG_SVG_PATTERN_IDS)[number];

// SVGパターンのメタデータ（ラベル・ファイル名・タイルサイズ）
// label: 省略時はIDの番号部分をそのまま使用
// size: CSS background-size に渡す文字列。"幅px 高さpx" で指定する（viewBox基準）
export const BG_SVG_PATTERN_META: Record<BgSvgPatternId, { label?: string; file: string; size: string }> = {
  "svg-pattern0451": { file: "svg-pattern0451.svg", size: "128px 128px" },
  "svg-pattern0455": { file: "svg-pattern0455.svg", size: "128px 128px" },
  "svg-pattern0461": { file: "svg-pattern0461.svg", size: "128px 133px" },
  "svg-pattern0476": { file: "svg-pattern0476.svg", size: "128px 128px" },
  "svg-pattern0477": { file: "svg-pattern0477.svg", size: "128px 182px" },
  "svg-pattern0489": { file: "svg-pattern0489.svg", size: "128px 119px" },
  "svg-pattern0490": { file: "svg-pattern0490.svg", size: "128px 135px" },
  "svg-pattern0499": { file: "svg-pattern0499.svg", size: "48px 48px" },
  "svg-pattern0507": { file: "svg-pattern0507.svg", size: "64px 64px" },
  "svg-pattern0517": { file: "svg-pattern0517.svg", size: "48px 82px" },
  "svg-pattern0527": { file: "svg-pattern0527.svg", size: "128px 93px" },
  "svg-pattern0539": { file: "svg-pattern0539.svg", size: "64px 74px" },
  "svg-pattern0563": { file: "svg-pattern0563.svg", size: "128px 128px" },
  "svg-pattern0586": { file: "svg-pattern0586.svg", size: "128px 128px" },
  "svg-pattern0589": { file: "svg-pattern0589.svg", size: "64px 74px" },
  "svg-pattern0590": { file: "svg-pattern0590.svg", size: "32px 68px" },
  "svg-pattern0595": { file: "svg-pattern0595.svg", size: "128px 111px" },
  "svg-pattern0597": { file: "svg-pattern0597.svg", size: "128px 128px" },
  "svg-pattern0598": { file: "svg-pattern0598.svg", size: "64px 50px" },
  "svg-pattern0609": { file: "svg-pattern0609.svg", size: "48px 48px" },
  "svg-pattern0611": { file: "svg-pattern0611.svg", size: "128px 126px" },
  "svg-pattern0617": { file: "svg-pattern0617.svg", size: "32px 32px" },
  "svg-pattern0634": { file: "svg-pattern0634.svg", size: "48px 48px" },
  "svg-pattern0636": { file: "svg-pattern0636.svg", size: "48px 48px" },
  "svg-pattern0638": { file: "svg-pattern0638.svg", size: "32px 32px" },
};

/** SVGパターンの表示ラベルを返す（label未設定の場合はIDの番号部分） */
export function getSvgPatternLabel(id: BgSvgPatternId): string {
  return BG_SVG_PATTERN_META[id].label ?? id.replace("svg-pattern", "No.");
}

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
