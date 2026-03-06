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
  modal: 950,
  overlay: 1090,
  sidebar: 1100,
  invite: 1200,
  inviteModal: 1300,
  roomError: 2000,
  scanlines: 9999,
} as const;
