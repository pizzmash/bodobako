import type { LucideIcon } from "lucide-react";
import {
  Star, Heart, Flame, Crown,
  Sun, Zap, Lightbulb, Bell,
  Leaf, Flower2, Sprout, TreePine,
  Snowflake, Anchor, Gem, Droplet,
  Bot,
} from "lucide-react";
import { RainbowVortexIcon } from "./RainbowVortexIcon";
import type { RobotColor, TargetColor } from "@bodobako/shared";

/** デザイントークン */
export const C = {
  bg: "#0F0F23",
  bgBoard: "#1A1A3E",
  bgCell: "#16213E",
  bgCellAlt: "#1A1F3C",
  gridLine: "#2D3561",
  wall: "#818CF8",
  wallGlow: "rgba(129,140,248,0.6)",
  primary: "#6366F1",
  primaryLight: "rgba(99,102,241,0.15)",
  primaryGlow: "rgba(99,102,241,0.4)",
  secondary: "#818CF8",
  accent: "#F43F5E",
  text: "#E2E8F0",
  muted: "#94A3B8",
  border: "#2D3561",
  card: "#1E1E4A",
  cardBorder: "#3730A3",
  target: "#FBBF24",
  targetGlow: "rgba(251,191,36,0.5)",
  success: "#22C55E",
  warning: "#EAB308",
} as const;

export const FONT = "'Poppins', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
export const APP_HEADER_HEIGHT = 76;

/** ロボット色 → 表示色 */
export const ROBOT_COLORS: Record<RobotColor, string> = {
  red: "#EF4444",
  yellow: "#EAB308",
  green: "#22C55E",
  blue: "#3B82F6",
  silver: "#94A3B8",
};

/** ロボット色 → 日本語ラベル */
export const ROBOT_LABELS: Record<RobotColor, string> = {
  red: "赤",
  yellow: "黄",
  green: "緑",
  blue: "青",
  silver: "銀",
};

export const BIDDING_TIME_SEC = 60;

/** ボードのセル数 */
export const BOARD_SIZE = 16;

/** ターゲット色ごとのアイコン（色内で一意） */
export const TARGET_ICONS: Record<TargetColor, LucideIcon[]> = {
  red:     [Star, Heart, Flame, Crown],
  yellow:  [Sun, Zap, Lightbulb, Bell],
  green:   [Leaf, Flower2, Sprout, TreePine],
  blue:    [Snowflake, Anchor, Gem, Droplet],
  silver:  [],
  rainbow: [RainbowVortexIcon as unknown as LucideIcon],
};

/** ターゲット表示色 */
export const TARGET_COLORS: Record<TargetColor, string> = {
  red:     "#EF4444",
  yellow:  "#EAB308",
  green:   "#22C55E",
  blue:    "#3B82F6",
  silver:  "#94A3B8",
  rainbow: "#818CF8",
};

export const ROBOT_ICON: LucideIcon = Bot;

/** レインボーコニックグラデーション（ホログラフィックチップ用） */
export const RAINBOW_COIN_BG =
  "conic-gradient(from 220deg at 36% 30%, #ef4444 0deg, #f97316 51deg, #eab308 102deg, #22c55e 153deg, #3b82f6 204deg, #8b5cf6 255deg, #ec4899 306deg, #ef4444 360deg)";
