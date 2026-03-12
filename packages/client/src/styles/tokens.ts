/** フォントファミリー定数（全コンポーネント共通） */
export const FONT =
  "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
export const BODY_FONT =
  "'Inter', 'Open Sans', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/** NyaMens ゲームのアクセントカラー */
export const NYAMENS_ACCENT = "#0EA5E9";

/** z-index 階層定数 */
export const Z = {
  header: 900,
  headerPopover: 930,
  modal: 950,
  gameSidebar: 970,
  overlay: 1090,
  sidebar: 1100,
  invite: 1200,
  inviteModal: 1300,
  roomError: 2000,
  scanlines: 9999,

  // モバイルタブバー用
  gameMobileTab: 25,

  // 音速飯点ゲーム内 z-index
  srGameSidebar: 40,
  srTableCard: 15,
  srDishBanner: 20,
  srPlayerInfo: 10,
  srHandArea: 50,
  srScrollBtn: 60,
  srCountdownOverlay: 9997,
  srCountdown: 9998,

  // ブロックスゲーム内ボードセル z-index（ボードの stacking context 内）
  blkBoardSvg: 1,   // SVGピース描画レイヤー
  blkBoardCell: 2,  // インタラクション用セルレイヤー
  blkCellOverlay: 1, // セル内のゴースト・ドット等のオーバーレイ
} as const;
