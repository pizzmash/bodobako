/**
 * 音速飯点 - UIスタイル定数とレイアウト定義
 */

import type { CSSProperties } from "react";

/**
 * カラーパレット（サンプルHTMLから）
 */
export const C = {
  primary: "#d74242",
  accentYellow: "#ffcc00",
  bgLight: "#f8f6f6",
  bgDark: "#201212",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
} as const;

/**
 * レイアウト定数
 */
export const LAYOUT = {
  sidebarWidth: 288, // 72 * 4 (Tailwind w-72)
  tableSize: 500,
  cardWidth: 112, // 28 * 4
  cardHeight: 160, // 40 * 4
  cardWidthSmall: 56, // small用
  cardHeightSmall: 80, // small用
  handHeight: 176, // 44 * 4
} as const;

/**
 * 共通スタイル
 */
export const styles: Record<string, CSSProperties> = {
  // サイドバー共通
  sidebar: {
    width: LAYOUT.sidebarWidth,
    backgroundColor: C.white,
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    zIndex: 40,
  },

  sidebarTitle: {
    marginBottom: "1.5rem",
    padding: "0.5rem",
  },

  // ゲームタイトル看板
  titleSign: {
    backgroundColor: C.primary,
    padding: "1rem",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderBottom: `4px solid ${C.accentYellow}`,
    overflow: "hidden",
  },

  titleInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.5rem 0.25rem",
    border: `4px double ${C.accentYellow}`,
    borderRadius: "0.75rem",
  },

  titleMain: {
    fontSize: "1.875rem",
    fontWeight: 800,
    color: C.white,
    letterSpacing: "0.15em",
    marginBottom: "0.25rem",
    textShadow: "2px 2px 0px rgba(0,0,0,0.2)",
  },

  titleSub: {
    fontSize: "0.5rem",
    fontWeight: 700,
    color: C.accentYellow,
    letterSpacing: "0.4em",
    textTransform: "uppercase",
  },

  // カード共通
  card: {
    position: "relative",
    backgroundColor: C.white,
    border: `4px solid ${C.gray200}`,
    borderRadius: "1rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
  },

  cardContent: {
    fontSize: "1.875rem",
    fontWeight: 800,
    color: C.primary,
  },

  cardLogo: {
    position: "absolute",
    top: "0.5rem",
    left: "0.5rem",
    fontSize: "0.5rem",
    fontWeight: 700,
    color: `${C.primary}4D`, // 30% opacity
  },

  // メニューアイテム
  menuHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem",
    paddingLeft: "0.5rem",
    marginTop: "0.5rem",
    borderTop: `1px solid ${C.gray100}`,
    paddingTop: "1rem",
  },

  menuTitle: {
    fontSize: "0.875rem",
    fontWeight: 800,
    fontStyle: "italic",
    color: C.gray700,
  },

  menuList: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  menuItem: {
    padding: "0.75rem",
    borderRadius: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuItemActive: {
    backgroundColor: `${C.primary}0D`, // 5% opacity
    border: `2px solid ${C.primary}33`, // 20% opacity
  },

  menuItemInactive: {
    backgroundColor: C.gray50,
    border: "2px solid transparent",
    opacity: 0.5,
  },

  menuName: {
    fontSize: "0.875rem",
    fontWeight: 700,
    fontStyle: "italic",
  },

  menuRecipe: {
    fontSize: "0.625rem",
    fontWeight: 500,
    marginTop: "0.25rem",
  },

  badge: {
    padding: "0.25rem 0.5rem",
    fontSize: "0.625rem",
    fontWeight: 700,
    borderRadius: "9999px",
  },

  badgeActive: {
    backgroundColor: C.primary,
    color: C.white,
    animation: "sr-pulse 1.5s ease-in-out infinite",
  },

  badgeInactive: {
    backgroundColor: C.gray200,
    color: C.gray500,
  },

  // プレイヤーアイテム
  playerItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    backgroundColor: C.gray50,
    borderRadius: "1rem",
    border: `1px solid ${C.gray100}`,
    position: "relative",
    overflow: "hidden",
  },

  playerProgress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: `${C.primary}1A`, // 10% opacity
    pointerEvents: "none",
    transition: "width 0.5s ease",
  },

  playerInfo: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 10,
  },

  playerName: {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: C.gray900,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  playerCards: {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: C.primary,
    marginTop: "0.25rem",
  },

  // 中央テーブル
  centerContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf2f2",
    overflow: "hidden",
    paddingBottom: LAYOUT.handHeight,
  },

  table: {
    position: "relative",
    width: LAYOUT.tableSize,
    height: LAYOUT.tableSize,
    borderRadius: "50%",
    border: `16px solid ${C.primary}`,
    background: "radial-gradient(circle, #ffffff 60%, #f0f0f0 100%)",
    boxShadow: "inset 0 0 40px rgba(0,0,0,0.1), 0 10px 30px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  tableInnerCircle: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    bottom: "1rem",
    left: "1rem",
    borderRadius: "50%",
    border: `1px solid ${C.primary}33`,
  },

  // 手札エリア
  handContainer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(12px)",
    borderTop: `4px solid ${C.primary}`,
    height: LAYOUT.handHeight,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0 1rem",
  },

  handLabel: {
    position: "absolute",
    top: "-1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: C.primary,
    color: C.white,
    padding: "0.25rem 1.5rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 800,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    border: `2px solid ${C.white}`,
  },

  handScroll: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    overflowX: "auto",
    maxWidth: "100%",
    padding: "2.5rem 2rem",
    whiteSpace: "nowrap",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
  },
};
