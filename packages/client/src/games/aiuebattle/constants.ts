import type React from "react";
import { useState, useEffect } from "react";
import { BOARD_CHARS } from "@bodobako/shared";

/* ── Colour palette ── */
export const C = {
  primary: "#f4d125",
  primaryLight: "#ffec6e",
  primaryDark: "#d4b51a",
  hit: "#e05555",
  hitBg: "#fff0f0",
  success: "#06d6a0",
  warning: "#ffbc42",
  bgMain: "#fafafa",
  bgCard: "#ffffff",
  textMain: "#181711",
  textSub: "#718096",
  border: "#181711",
  borderDark: "#cbd5e0",
} as const;

// カラフルな文字ボタンのカラー（サンプルHTMLより）
export const CHAR_COLORS = [
  "#ff5c8d", // ピンク
  "#ffbc42", // オレンジ
  "#0496ff", // 青
  "#06d6a0", // 緑
  "#9d4edd", // 紫
] as const;

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

export function useIsWideBoard(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WIDE_BREAKPOINT
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isWide;
}

export function charToIndex(char: string): number {
  return (BOARD_CHARS as readonly string[]).indexOf(char);
}

export const PLAYER_COLORS = [
  "#0496ff", 
  "#ff5c8d", 
  "#ffbc42", 
  "#06d6a0", 
  "#9d4edd", 
  "#ec4899"
];

/* ── Styles ── */
export const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    fontFamily: FONT,
    padding: "1rem",
    background: C.bgMain,
    color: C.textMain,
  },
  subtitle: {
    color: C.textSub,
    margin: "0.5rem 0",
    textAlign: "center",
    fontSize: "0.95rem",
  },
  topicBadge: {
    fontSize: "1.05rem",
    margin: "0.25rem 0 0.5rem",
    padding: "0.4rem 1.2rem",
    borderRadius: "20px",
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  waiting: {
    color: C.textSub,
    fontStyle: "italic",
    fontSize: "1.1rem",
    marginTop: "2rem",
  },
  topicGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "center",
    maxWidth: "600px",
    margin: "1rem auto",
    maxHeight: "400px",
    overflowY: "auto",
    padding: "1.5rem",
    background: "linear-gradient(145deg, #ffffff, #fafafa)",
    borderRadius: "20px",
    border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
  },
  topicButton: {
    padding: "0.6rem 1.4rem",
    fontSize: "1rem",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(145deg, #ffffff, #f5f5f5)",
    cursor: "pointer",
    fontFamily: FONT,
    color: C.textMain,
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "ab-fadeIn .3s ease-out both",
  },
  customTopicRow: {
    display: "flex",
    gap: "0.5rem",
    margin: "1rem 0",
    justifyContent: "center",
  },
  input: {
    padding: "0.7rem 1rem",
    fontSize: "1rem",
    borderRadius: "14px",
    border: "2px solid rgba(0,0,0,0.1)",
    width: "220px",
    fontFamily: FONT,
    background: "linear-gradient(145deg, #ffffff, #fafafa)",
    color: C.textMain,
    transition: "all .25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  wordDisplay: {
    display: "flex",
    gap: "0.35rem",
    margin: "1rem 0 0.5rem",
    justifyContent: "center",
  },
  wordCell: {
    width: "42px",
    height: "42px",
    border: `2px solid ${C.borderDark}`,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: "bold",
    background: C.bgCard,
    transition: "border-color .2s, background .2s",
  },
  charCount: {
    color: C.textSub,
    fontSize: "0.85rem",
    margin: "0 0 0.5rem",
    textAlign: "center",
  },
  kbCard: {
    background: "linear-gradient(145deg, #ffffff, #fafafa)",
    borderRadius: "24px",
    border: `2px solid rgba(24,23,17,0.1)`,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
    padding: "2rem",
    margin: "1rem 0",
  },
  boardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  boardRow: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  boardGridH: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  boardRowH: {
    display: "flex",
    gap: "3px",
    justifyContent: "center",
  },
  charButton: {
    width: "48px",
    height: "48px",
    fontSize: "1.2rem",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(145deg, #ffffff, #f5f5f5)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    fontWeight: 700,
    color: C.textMain,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
    position: "relative",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  charButtonH: {
    width: "42px",
    height: "42px",
    fontSize: "1.1rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(145deg, #ffffff, #f5f5f5)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    fontWeight: 700,
    color: C.textMain,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
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
    background: "linear-gradient(145deg, #e5e7eb, #d1d5db)",
    color: "#9ca3af",
    cursor: "not-allowed",
    border: "none",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
    opacity: 0.5,
  },
  actionRow: {
    display: "flex",
    gap: "1rem",
    margin: "1rem 0",
    justifyContent: "center",
  },
  backspaceButton: {
    padding: "0.75rem 2rem",
    fontSize: "1.1rem",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #ffbc42, #ff9f1c)",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    boxShadow: "0 4px 15px rgba(255,188,66,0.4), 0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  submitButton: {
    padding: "0.75rem 2rem",
    fontSize: "1.1rem",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #ff5c8d, #ff3366)",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 700,
    boxShadow: "0 4px 15px rgba(255,92,141,0.4), 0 2px 4px rgba(0,0,0,0.1)",
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
    gap: "1rem",
    justifyContent: "center",
    margin: "1rem 0",
  },
  sheet: {
    padding: "1.25rem 1.5rem",
    borderRadius: "20px",
    background: "linear-gradient(145deg, #ffffff, #fafafa)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
    border: "none",
    borderLeft: "4px solid",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  sheetName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    color: C.textMain,
  },
  sheetCells: {
    display: "flex",
    gap: "3px",
  },
  sheetCell: {
    width: "34px",
    height: "34px",
    border: `1.5px solid ${C.border}`,
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "background .3s, border-color .3s",
  },
  confirmOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  confirmCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "1.5rem 2rem",
    textAlign: "center" as const,
    boxShadow: "0 8px 32px rgba(0,0,0,.2)",
    minWidth: 260,
    fontFamily: FONT,
  },
  confirmTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: C.textMain,
  },
  confirmWord: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
    marginBottom: "1.25rem",
  },
  confirmChar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#e8f0fe",
    border: `2px solid ${C.primary}`,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: C.textMain,
  },
  confirmButtons: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
  },
  confirmCancel: {
    padding: "0.6rem 1.5rem",
    fontSize: "0.95rem",
    borderRadius: 10,
    border: "none",
    background: "#e2e8f0",
    color: C.textMain,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
  },
  confirmSubmit: {
    padding: "0.6rem 1.5rem",
    fontSize: "0.95rem",
    borderRadius: 10,
    border: "none",
    background: C.primary,
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: `0 2px 8px ${C.primary}44`,
  },
};
