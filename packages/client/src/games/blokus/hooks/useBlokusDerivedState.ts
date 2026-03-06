import { useMemo } from "react";
import type { BlokusState, RoomInfo } from "@bodobako/shared";
import { getCurrentPlayerId } from "@bodobako/shared";
import { BLOKUS_COLORS } from "../constants";

interface UseBlokusDerivedStateOptions {
  state: BlokusState;
  playerId: string;
  room: RoomInfo;
  isMyTurn: boolean;
}

interface BlokusDerivedState {
  myColorIndices: (0 | 1 | 2 | 3)[];
  turnMessage: string | null;
  turnColor: string;
}

/**
 * ブロックスのUIで必要な派生値をまとめて計算する。
 * myColorIndices / turnMessage / turnColor
 */
export function useBlokusDerivedState({
  state,
  playerId,
  room,
  isMyTurn,
}: UseBlokusDerivedStateOptions): BlokusDerivedState {
  const myPlayerIndex = state.playerIds.indexOf(playerId);
  const currentColorIndex = state.currentColorIndex;

  const myColorIndices = useMemo(
    () =>
      ([0, 1, 2, 3] as const).filter((c) => {
        if (state.colorOwner[c] === myPlayerIndex) return true;
        // 3人戦フリーカラー
        if (state.colorOwner[c] === -1) return true;
        return false;
      }),
    [state, myPlayerIndex],
  );

  const turnPlayerId = getCurrentPlayerId(state);
  const turnPlayerName = room.players.find((p) => p.id === turnPlayerId)?.name ?? "相手";

  const turnMessage = state.finished
    ? null
    : isMyTurn
      ? `あなたの番です（${BLOKUS_COLORS[currentColorIndex].label}）`
      : `${turnPlayerName} の番です`;

  const turnColor = BLOKUS_COLORS[currentColorIndex].fill;

  return { myColorIndices, turnMessage, turnColor };
}
