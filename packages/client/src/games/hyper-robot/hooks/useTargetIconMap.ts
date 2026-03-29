import { useMemo } from "react";
import type { TargetColor, TargetMark } from "@bodobako/shared";
import type { LucideIcon } from "lucide-react";
import { TARGET_ICONS } from "../constants";

export function useTargetIconMap(allTargets: TargetMark[]): Map<number, LucideIcon> {
  return useMemo(() => {
    const colorGroups: Partial<Record<TargetColor, TargetMark[]>> = {};
    for (const t of allTargets) {
      (colorGroups[t.color] ??= []).push(t);
    }
    for (const list of Object.values(colorGroups)) {
      list?.sort((a, b) => a.id - b.id);
    }
    const result = new Map<number, LucideIcon>();
    for (const [color, list] of Object.entries(colorGroups) as [TargetColor, TargetMark[]][]) {
      const icons = TARGET_ICONS[color] ?? [];
      list.forEach((t, i) => {
        const icon = icons[i % icons.length];
        if (icon) result.set(t.id, icon);
      });
    }
    return result;
  }, [allTargets]);
}
