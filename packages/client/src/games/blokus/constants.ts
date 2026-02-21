// ---------------------------------------------------------------------------
// ブロックス UI — デザイントークン
// ---------------------------------------------------------------------------

/** 4色のカラー定義（物理ブロックスに準拠） */
export const BLOKUS_COLORS = [
  { fill: "#3b82f6", label: "青",  text: "#ffffff" }, // 色0: 左上
  { fill: "#f59e0b", label: "黄",  text: "#1a1a1a" }, // 色1: 右上
  { fill: "#ef4444", label: "赤",  text: "#ffffff" }, // 色2: 右下
  { fill: "#22c55e", label: "緑",  text: "#fff"    }, // 色3: 左下
] as const;

/** 盤面セルサイズ（デスクトップ） */
export const CELL_SIZE = 28;

/** パレットサムネイル内のセルサイズ */
export const MINI_CELL = 6;

/** コントロールパネルのプレビューセルサイズ */
export const PREVIEW_CELL = 14;

/** サムネイル内セル間隔 */
export const MINI_CELL_GAP = 1;

/** 空セルの色 (ガラス感: ほぼ透明な白) */
export const EMPTY_CELL_COLOR = "rgba(255,255,255,0.72)";

/** ボード背景色（セル間・縁の溝色） */
export const BOARD_BG = "rgba(180,195,220,0.35)";

/** セル間ギャップ px */
export const CELL_GAP = 2;

/** ボードの内側パディング px */
export const BOARD_PADDING = 6;

/** 配置可能センタードットの色 */
export const VALID_DOT_COLOR = "rgba(30,41,59,0.45)";

/** ゴースト（有効配置）のオーバーレイ色 */
export const GHOST_VALID_BG = "rgba(255,255,255,0.65)";

/** ゴースト（無効配置）のオーバーレイ色 */
export const GHOST_INVALID_BG = "rgba(239,68,68,0.5)";

/** フォントスタック */
export const FONT =
  "'Inter', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/** ボードの論理サイズ (px)：(CELL_SIZE + CELL_GAP) × 20 − CELL_GAP + BOARD_PADDING × 2 */
export const BOARD_PX = CELL_SIZE * 20 + 2 * 20 + 2 * 6; // 572

/** 各色のスタートコーナー [row, col] */
export const CORNER_POSITIONS: readonly [number, number][] = [
  [0, 0],   // 色0 (青)
  [0, 19],  // 色1 (黄)
  [19, 19], // 色2 (赤)
  [19, 0],  // 色3 (緑)
] as const;

// ---------------------------------------------------------------------------
// レイアウト・サーフェスカラー（ライトテーマ）
// ---------------------------------------------------------------------------

export const BG_BASE     = "#f0f4ff";
export const BG_GRADIENT = "linear-gradient(145deg, #eef2ff 0%, #fafaff 60%, #fff7f0 100%)";
export const SURFACE        = "rgba(255,255,255,0.92)";
export const SURFACE_BORDER = "rgba(0,0,0,0.07)";
export const TEXT_PRIMARY   = "#1e293b";
export const TEXT_MUTED     = "#64748b";
