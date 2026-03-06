export const C = {
  primary: "#f49d25",
  primaryLight: "rgba(244,157,37,0.10)",
  primaryBorder: "rgba(244,157,37,0.30)",
  bg: "#f0ede8",
  card: "#ffffff",
  text: "#1e293b",
  muted: "#94a3b8",
  border: "#e2e8f0",
} as const;

export const CARD_BACK_STYLE = {
  backgroundColor: C.primary,
  backgroundImage:
    "radial-gradient(#ffffff 10%, transparent 10%), radial-gradient(#ffffff 10%, transparent 10%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 10px 10px",
  border: "2px solid rgba(255,255,255,0.5)",
};

export const FONT = `'Spline Sans', 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
export const APP_HEADER_HEIGHT = 76;
export const NANA_HAND_FOOTER_HEIGHT_DESKTOP = 143;
export const NANA_HAND_FOOTER_HEIGHT_MOBILE = 121;
export const NANA_PLAYER_BAR_HEIGHT_MOBILE = 132;
export const NANA_TAB_HEIGHT_MOBILE = 52;
export const PLAYER_COLORS = ["#0496ff", "#ff5c8d", "#22c55e", "#06d6a0", "#9d4edd", "#ec4899"];
