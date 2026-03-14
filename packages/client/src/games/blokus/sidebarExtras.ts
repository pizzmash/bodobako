import type { BlokusState } from "@bodobako/shared";
import { BLOKUS_COLORS } from "./constants";

export function getBlokusPlayerColorMap(state: BlokusState): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < state.playerIds.length; i++) {
    const pid = state.playerIds[i];
    const ownedColor = ([0, 1, 2, 3] as const).find((c) => state.colorOwner[c] === i);
    if (ownedColor !== undefined) {
      map[pid] = BLOKUS_COLORS[ownedColor].fill;
    }
  }
  return map;
}
