import type { BlokusTrigonState, RoomInfo } from "@bodobako/shared";
import { trigonGetCurrentPlayerId } from "@bodobako/shared";
import { useMemo } from "react";
import { TRIGON_COLORS } from "../constants";

interface Options {
  state: BlokusTrigonState;
  playerId: string;
  room: RoomInfo;
  isMyTurn: boolean;
}

interface DerivedState {
  myColorIndices: number[];
  turnMessage: string | null;
  turnColor: string;
}

export function useBlokusTrigonDerivedState({
  state,
  playerId,
  room,
  isMyTurn,
}: Options): DerivedState {
  const myPlayerIndex = state.playerIds.indexOf(playerId);
  const currentColorIndex = state.currentColorIndex;

  const myColorIndices = useMemo(
    () =>
      Array.from({ length: state.numColors }, (_, i) => i).filter(
        (c) => state.colorOwner[c] === myPlayerIndex,
      ),
    [state, myPlayerIndex],
  );

  const turnPlayerId = trigonGetCurrentPlayerId(state);
  const turnPlayerName =
    room.players.find((p) => p.id === turnPlayerId)?.name ?? "相手";

  const turnMessage = state.finished
    ? null
    : isMyTurn
      ? `あなたの番です（${TRIGON_COLORS[currentColorIndex]?.label ?? ""}）`
      : `${turnPlayerName} の番です`;

  const turnColor = TRIGON_COLORS[currentColorIndex]?.fill ?? TRIGON_COLORS[0].fill;

  return { myColorIndices, turnMessage, turnColor };
}
