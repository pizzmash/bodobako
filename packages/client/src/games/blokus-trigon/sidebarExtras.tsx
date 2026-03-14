import type { BlokusTrigonState } from "@bodobako/shared";
import { TRIGON_PIECES } from "@bodobako/shared";
import type { ReactNode } from "react";
import type { GameLogItem } from "../../hooks/useGameLog";
import { TriPieceThumbnail } from "./TriPieceThumbnail";
import { TRIGON_COLORS } from "./constants";

export function getBlokusTrigonPlayerColorMap(state: BlokusTrigonState): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < state.playerIds.length; i++) {
    const pid = state.playerIds[i];
    const ownedColor = Array.from({ length: state.numColors }, (_, c) => c).find(
      (c) => state.colorOwner[c] === i,
    );
    if (ownedColor !== undefined) {
      map[pid] = TRIGON_COLORS[ownedColor].fill;
    }
  }
  return map;
}

export function renderBlokusTrigonLogItemExtra(item: GameLogItem): ReactNode {
  const pieceId = item.metadata?.pieceId;
  const colorIndex = item.metadata?.colorIndex;
  if (typeof pieceId !== "number" || typeof colorIndex !== "number") return null;
  if (pieceId < 0 || pieceId >= TRIGON_PIECES.length) return null;
  const variant = TRIGON_PIECES[pieceId].variants[0];
  const color = TRIGON_COLORS[colorIndex]?.fill ?? "#888";
  return <TriPieceThumbnail variant={variant} color={color} />;
}
