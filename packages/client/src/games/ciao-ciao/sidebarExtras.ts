import type { CiaoCiaoState } from "@bodobako/shared";
import { CIAO_PLAYER_COLORS } from "./constants";

export function getCiaoCiaoPlayerColorMap(
  state: CiaoCiaoState,
): Record<string, string> {
  const map: Record<string, string> = {};
  state.playerIds.forEach((pid, i) => {
    map[pid] = CIAO_PLAYER_COLORS[i]?.fill ?? "#888";
  });
  return map;
}
