// ---------------------------------------------------------------------------
// ブロックストライゴン UI — デザイントークン
// ---------------------------------------------------------------------------

/** 6色のカラー定義（ブロックストライゴンに準拠） */
export const TRIGON_COLORS = [
  { fill: "#3b82f6", label: "青", text: "#ffffff" }, // 色0
  { fill: "#f59e0b", label: "黄", text: "#1a1a1a" }, // 色1
  { fill: "#ef4444", label: "赤", text: "#ffffff" }, // 色2
  { fill: "#22c55e", label: "緑", text: "#fff" },    // 色3
  { fill: "#a855f7", label: "紫", text: "#ffffff" }, // 色4
  { fill: "#f97316", label: "橙", text: "#ffffff" }, // 色5
] as const;

/** 三角セルの1辺のサイズ (px) — SVG viewBox 内のスケール */
export const TRI_SIDE = 22;

/** 三角セルの高さ (equilateral triangle) */
export const TRI_HEIGHT = TRI_SIDE * Math.sqrt(3) / 2;

/** SVG ボードの余白 */
export const BOARD_MARGIN = 8;

/**
 * 盤面の pixel 幅（上半分 row8: 35列 → 35 * TRI_SIDE/2 + margin）
 * 三角タイルの幅は TRI_SIDE/2 ずつシフト（隣接三角は半セルずらし）。
 * 最大列数35: 幅 = (35+1)/2 * TRI_SIDE + BOARD_MARGIN*2
 */
export const BOARD_SVG_WIDTH = Math.ceil((35 + 1) / 2 * TRI_SIDE) + BOARD_MARGIN * 2;
export const BOARD_SVG_HEIGHT = Math.ceil(18 * TRI_HEIGHT) + BOARD_MARGIN * 2;

/** レスポンシブボード最大幅 */
export const BOARD_PX = BOARD_SVG_WIDTH;

/** パレットサムネイル内のセルサイズ */
export const MINI_TRI_SIDE = 7;

/** コントロールパネルのプレビューセルサイズ */
export const PREVIEW_TRI_SIDE = 14;

/** 配置可能センタードットの色 */
export const VALID_DOT_COLOR = "rgba(30,41,59,0.45)";

/** 空セルの色 */
export const EMPTY_CELL_COLOR = "rgba(255,255,255,0.72)";

// ---------------------------------------------------------------------------
// レイアウト・サーフェスカラー（ライトテーマ）
// ---------------------------------------------------------------------------

export const BG_GRADIENT = "linear-gradient(145deg, #eef2ff 0%, #fafaff 60%, #fff7f0 100%)";
export const SURFACE = "rgba(255,255,255,0.92)";
export const SURFACE_BORDER = "rgba(0,0,0,0.07)";
export const TEXT_PRIMARY = "#1e293b";
export const TEXT_MUTED = "#94a3b8";
