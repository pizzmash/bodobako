import type { ReactNode } from "react";
import type { RobotColor, TargetColor } from "@bodobako/shared";
import type { GameLogItem } from "../../hooks/useGameLog";
import { Bot } from "lucide-react";
import { ROBOT_COLORS, TARGET_COLORS, TARGET_ICONS } from "./constants";

export function renderHyperRobotLogItemExtra(item: GameLogItem): ReactNode {
  // チップ獲得ログ: metadata.targetColor + metadata.iconIndex
  const targetColor = item.metadata?.targetColor as TargetColor | undefined;
  const iconIndex = item.metadata?.iconIndex as number | undefined;
  if (targetColor != null && iconIndex != null) {
    const icons = TARGET_ICONS[targetColor] ?? [];
    const Icon = icons[iconIndex % Math.max(1, icons.length)];
    if (Icon) {
      return <Icon size={12} color={TARGET_COLORS[targetColor]} strokeWidth={2} aria-hidden="true" />;
    }
  }
  // ロボット移動ログ: metadata.robotColor
  const robotColor = item.metadata?.robotColor as RobotColor | undefined;
  if (robotColor && robotColor in ROBOT_COLORS) {
    return <Bot size={12} color={ROBOT_COLORS[robotColor]} strokeWidth={2} aria-hidden="true" />;
  }
  return null;
}
