import { BOARD_CHARS } from "@bodobako/shared";
import type React from "react";
import { Z } from "../../styles/tokens";

/* ── Design System ── */

// Spacing Scale (8px base)
export const SPACING = {
  xs: "0.25rem",   // 4px
  sm: "0.5rem",    // 8px
  md: "0.75rem",   // 12px
  lg: "1rem",      // 16px
  xl: "1.5rem",    // 24px
  "2xl": "2rem",   // 32px
  "3xl": "3rem",   // 48px
} as const;

// Typography Scale
export const TYPOGRAPHY = {
  xs: { fontSize: "0.75rem", lineHeight: "1.5" },      // 12px
  sm: { fontSize: "0.875rem", lineHeight: "1.5" },     // 14px
  base: { fontSize: "1rem", lineHeight: "1.5" },       // 16px
  lg: { fontSize: "1.125rem", lineHeight: "1.5" },     // 18px
  xl: { fontSize: "1.25rem", lineHeight: "1.4" },      // 20px
  "2xl": { fontSize: "1.5rem", lineHeight: "1.3" },    // 24px
  "3xl": { fontSize: "2rem", lineHeight: "1.2" },      // 32px
} as const;

// Color Palette (Simplified & Accessible)
export const C = {
  // Primary - Yellow accent
  primary: "#f4d125",
  primaryLight: "#fff4cc",
  primaryDark: "#d4b51a",
  
  // Accent - Pink for important actions
  accent: "#ff5c8d",
  accentLight: "#ffebf1",
  
  // Success - Soft lime green (softer than before)
  success: "#8ed973",
  successLight: "#e6faf5",
  successBg: "linear-gradient(135deg, #f4d125 0%, #8ed973 100%)",
  
  // Warning - Orange
  warning: "#ff9f1c",
  warningLight: "#fff3e0",
  
  // Neutral - Grays
  gray50: "#fafafa",
  gray100: "#f5f5f5",
  gray200: "#e5e5e5",
  gray300: "#d4d4d4",
  gray400: "#a3a3a3",
  gray500: "#737373",
  gray600: "#525252",
  gray700: "#404040",
  gray800: "#262626",
  gray900: "#171717",
  
  // Legacy aliases (for gradual migration)
  bgMain: "#fafafa",
  bgCard: "#ffffff",
  textMain: "#171717",
  textSub: "#737373",
  border: "rgba(0,0,0,0.08)",
  borderDark: "#e5e5e5",
} as const;

// Shadow Scale
export const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
  lg: "0 8px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)",
  xl: "0 12px 32px rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.08)",
} as const;

// Border Radius Scale
export const RADIUS = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  full: "9999px",
} as const;

export { PLAYER_COLORS } from "../../lib/color";

export const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* ── Layout helpers ── */
export const BOARD_LAYOUT: (string | null)[][] = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", null, "ゆ", null, "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", null, "を", null, "ん"],
  ["ー"],
];

/* ── Horizontal (transposed) layout: 5 rows × 11 cols, あ行 on the right ── */
export const BOARD_LAYOUT_HORIZONTAL: (string | null)[][] = [0, 1, 2, 3, 4].map(
  (vowelIdx) =>
    [...BOARD_LAYOUT].reverse().map((row) =>
      vowelIdx < row.length ? (row[vowelIdx] ?? null) : null
    )
);

const WIDE_BREAKPOINT = 600;

export function charToIndex(char: string): number {
  return (BOARD_CHARS as readonly string[]).indexOf(char);
}

/* ── Common Component Styles ── */

// Topic Card (お題カード) - 全フェーズで共通使用
export const topicCardStyle: React.CSSProperties = {
  background: C.bgCard,
  padding: SPACING.xl,
  borderRadius: RADIUS.xl,
  border: `2px solid ${C.border}`,
  boxShadow: SHADOWS.md,
  textAlign: "center",
  maxWidth: "100%",
};

export const topicBadgeStyle: React.CSSProperties = {
  ...TYPOGRAPHY.xs,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: C.textMain,
  background: C.primaryLight,
  padding: `${SPACING.xs} ${SPACING.lg}`,
  borderRadius: RADIUS.full,
  display: "inline-block",
  marginBottom: SPACING.md,
  border: `2px solid ${C.primary}`,
};

export const topicTextStyle: React.CSSProperties = {
  ...TYPOGRAPHY["2xl"],
  fontWeight: 900,
  color: C.textMain,
  margin: 0,
  letterSpacing: "0.02em",
  wordBreak: "break-word",
};

/* ── Styles ── */
export const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    fontFamily: FONT,
    padding: SPACING.lg,
    background: C.gray50,
    color: C.textMain,
  },
  subtitle: {
    color: C.textSub,
    margin: `${SPACING.md} 0`,
    textAlign: "center",
    ...TYPOGRAPHY.base,
  },
  waiting: {
    color: C.textSub,
    fontStyle: "italic",
    ...TYPOGRAPHY.lg,
    marginTop: SPACING["2xl"],
  },
  topicGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: SPACING.md,
    justifyContent: "center",
    width: "100%",
    maxWidth: "600px",
    margin: `${SPACING.lg} auto`,
    padding: `${SPACING.lg} ${SPACING.md}`,
    background: C.bgCard,
    borderRadius: RADIUS.xl,
    border: `2px solid ${C.border}`,
    boxShadow: SHADOWS.md,
  },
  topicButton: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    ...TYPOGRAPHY.base,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.gray100,
    cursor: "pointer",
    fontFamily: FONT,
    color: C.textMain,
    fontWeight: 600,
    boxShadow: SHADOWS.sm,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "ab-fadeIn .3s ease-out both",
  },
  customTopicRow: {
    display: "flex",
    gap: SPACING.md,
    margin: `${SPACING.lg} 0`,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  input: {
    padding: `${SPACING.md} ${SPACING.lg}`,
    ...TYPOGRAPHY.base,
    borderRadius: RADIUS.md,
    border: `2px solid ${C.border}`,
    minWidth: "180px",
    maxWidth: "100%",
    flex: "1 1 auto",
    fontFamily: FONT,
    background: C.bgCard,
    color: C.textMain,
    transition: "all .2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: SHADOWS.sm,
  },
  wordDisplay: {
    display: "flex",
    gap: "clamp(4px, 1vw, 8px)",
    margin: `${SPACING.lg} 0`,
    justifyContent: "center",
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  charCount: {
    color: C.textSub,
    ...TYPOGRAPHY.sm,
    margin: `0 0 ${SPACING.md}`,
    textAlign: "center",
  },
  kbCard: {
    background: C.bgCard,
    borderRadius: RADIUS.xl,
    border: `2px solid ${C.border}`,
    boxShadow: SHADOWS.md,
    padding: "clamp(12px, 3vw, 32px)",
    margin: `${SPACING.lg} 0`,
  },
  boardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: SPACING.xs,
  },
  boardRow: {
    display: "flex",
    gap: SPACING.xs,
    justifyContent: "center",
  },
  boardGridH: {
    display: "flex",
    flexDirection: "column",
    gap: SPACING.xs,
  },
  boardRowH: {
    display: "flex",
    gap: SPACING.xs,
    justifyContent: "center",
  },
  charButton: {
    width: "48px",
    height: "48px",
    ...TYPOGRAPHY.lg,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.bgCard,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    fontWeight: 700,
    color: C.textMain,
    boxShadow: SHADOWS.sm,
    position: "relative",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  charButtonH: {
    width: "42px",
    height: "42px",
    ...TYPOGRAPHY.base,
    borderRadius: RADIUS.sm,
    border: "none",
    background: C.bgCard,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    fontWeight: 700,
    color: C.textMain,
    boxShadow: SHADOWS.sm,
    position: "relative",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  charEmpty: {
    width: "48px",
    height: "48px",
  },
  charEmptyH: {
    width: "42px",
    height: "42px",
  },
  charUsed: {
    background: C.gray200,
    color: C.gray400,
    cursor: "not-allowed",
    border: "none",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
    opacity: 0.6,
  },
  actionRow: {
    display: "flex",
    gap: SPACING.lg,
    margin: `${SPACING.lg} 0`,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  backspaceButton: {
    padding: `${SPACING.md} ${SPACING["2xl"]}`,
    ...TYPOGRAPHY.lg,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.warning,
    color: C.bgCard,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    boxShadow: `0 4px 12px ${C.warning}40`,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  submitButton: {
    padding: `${SPACING.md} ${SPACING["2xl"]}`,
    ...TYPOGRAPHY.lg,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.primary,
    color: C.textMain,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    boxShadow: `0 4px 12px ${C.primary}40`,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  turnBanner: {
    fontSize: "1.3rem",
    fontWeight: 800,
    margin: "0.5rem 0 1rem",
    padding: "1.5rem 2rem",
    borderRadius: "24px",
    background: C.bgCard,
    border: `4px solid ${C.border}`,
    boxShadow: "8px 8px 0 #181711",
    textAlign: "center",
    animation: "ab-fadeIn .3s ease-out",
    position: "relative",
    overflow: "hidden",
  },
  attackBanner: {
    fontSize: "1.05rem",
    fontWeight: 700,
    margin: "0.25rem 0 0.5rem",
    padding: "0.5rem 1.2rem",
    borderRadius: "10px",
    border: "2px solid",
    textAlign: "center",
  },
  sheets: {
    display: "flex",
    flexWrap: "wrap",
    gap: SPACING.lg,
    justifyContent: "center",
    margin: `${SPACING.lg} 0`,
  },
  sheet: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    background: C.bgCard,
    boxShadow: SHADOWS.md,
    border: "none",
    borderLeft: "4px solid",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  sheetName: {
    ...TYPOGRAPHY.sm,
    fontWeight: 600,
    marginBottom: SPACING.md,
    display: "flex",
    alignItems: "center",
    color: C.textMain,
  },
  sheetCells: {
    display: "flex",
    gap: SPACING.xs,
  },
  sheetCell: {
    width: "36px",
    height: "36px",
    border: `2px solid ${C.border}`,
    borderRadius: RADIUS.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...TYPOGRAPHY.base,
    fontWeight: 700,
    transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  confirmOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: Z.modal,
    padding: SPACING.lg,
  },
  confirmCard: {
    background: C.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    textAlign: "center" as const,
    boxShadow: SHADOWS.xl,
    minWidth: "min(280px, 90vw)",
    maxWidth: "90%",
    fontFamily: FONT,
  },
  confirmTitle: {
    ...TYPOGRAPHY.lg,
    fontWeight: 700,
    marginBottom: SPACING.lg,
    color: C.textMain,
  },
  confirmWord: {
    display: "flex",
    gap: "clamp(3px, 1vw, 8px)",
    justifyContent: "center",
    marginBottom: SPACING.xl,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  confirmChar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "clamp(34px, 9vw, 44px)",
    height: "clamp(34px, 9vw, 44px)",
    minWidth: "34px",
    minHeight: "34px",
    borderRadius: RADIUS.sm,
    background: C.primaryLight,
    border: `2px solid ${C.primary}`,
    ...TYPOGRAPHY.lg,
    fontWeight: 700,
    color: C.textMain,
    flexShrink: 0,
  },
  confirmButtons: {
    display: "flex",
    gap: SPACING.md,
    justifyContent: "center",
  },
  confirmCancel: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    ...TYPOGRAPHY.base,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.gray200,
    color: C.textMain,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  confirmSubmit: {
    padding: `${SPACING.md} ${SPACING.xl}`,
    ...TYPOGRAPHY.base,
    borderRadius: RADIUS.md,
    border: "none",
    background: C.primary,
    color: C.textMain,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    boxShadow: `0 4px 12px ${C.primary}40`,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};
