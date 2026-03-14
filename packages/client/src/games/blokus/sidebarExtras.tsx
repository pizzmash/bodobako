import type { BlokusState, PieceVariant } from "@bodobako/shared";
import { NUM_PIECES, PIECES } from "@bodobako/shared";
import type { ReactNode } from "react";
import type { GameLogItem } from "../../hooks/useGameLog";
import { BlokusPieceThumbnail } from "./BlokusPieceThumbnail";
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

export function renderBlokusLogItemExtra(item: GameLogItem): ReactNode {
  const pieceId = item.metadata?.pieceId;
  const colorIndex = item.metadata?.colorIndex;
  if (typeof pieceId !== "number" || typeof colorIndex !== "number") return null;
  if (pieceId < 0 || pieceId >= NUM_PIECES) return null;
  const variant: PieceVariant = PIECES[pieceId].variants[0];
  const color = BLOKUS_COLORS[colorIndex as 0 | 1 | 2 | 3]?.fill ?? "#888";
  return <BlokusPieceThumbnail variant={variant} color={color} />;
}
