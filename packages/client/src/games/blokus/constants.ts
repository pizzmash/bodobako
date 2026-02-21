// ---------------------------------------------------------------------------
// ブロックス UI — デザイントークン
// ---------------------------------------------------------------------------

/** 4色のカラー定義（物理ブロックスに準拠） */
export const BLOKUS_COLORS = [
  { fill: "#3b82f6", label: "青", text: "#ffffff" }, // 色0: 左上
  { fill: "#eab308", label: "黄", text: "#1a1a1a" }, // 色1: 右上
  { fill: "#ef4444", label: "赤", text: "#ffffff" }, // 色2: 右下
  { fill: "#22c55e", label: "緑", text: "#ffffff" }, // 色3: 左下
] as const;

/** 盤面セルサイズ（デスクトップ） */
export const CELL_SIZE = 28;

/** パレットサムネイル内のセルサイズ */
export const MINI_CELL = 6;

/** コントロールパネルのプレビューセルサイズ */
export const PREVIEW_CELL = 14;

/** サムネイル内セル間隔 */
export const MINI_CELL_GAP = 1;

/** 空セルの色 */
export const EMPTY_CELL_COLOR = "#d1d5db";

/** ボード背景色 */
export const BOARD_BG = "#374151";

/** ボードグリッド線の色 */
export const BOARD_LINE_COLOR = "rgba(255,255,255,0.07)";

/** 配置可能センタードットの色 */
export const VALID_DOT_COLOR = "rgba(255,255,255,0.65)";

/** ゴースト（有効配置）のオーバーレイ色 */
export const GHOST_VALID_BG = "rgba(255,255,255,0.52)";

/** ゴースト（無効配置）のオーバーレイ色 */
export const GHOST_INVALID_BG = "rgba(239,68,68,0.48)";

/** フォントスタック */
export const FONT =
  "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/** ボードの論理サイズ (px)：CELL_SIZE × 20 */
export const BOARD_PX = CELL_SIZE * 20; // 560

/** 各色のスタートコーナー [row, col] */
export const CORNER_POSITIONS: readonly [number, number][] = [
  [0, 0], // 色0 (青)
  [0, 19], // 色1 (黄)
  [19, 19], // 色2 (赤)
  [19, 0], // 色3 (緑)
] as const;
