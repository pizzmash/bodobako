/**
 * 音速飯店 - リザルト画面
 */

import type { RoomInfo, SonicRestaurantState } from "@bodobako/shared";
import { GameRankingResult } from "../../components/GameRankingResult";
import { C } from "./constants";

interface SonicRestaurantResultProps {
  state: SonicRestaurantState;
  room: RoomInfo;
  playerId: string;
  ranking: string[];
  onRestart: () => void;
  onLeave: () => void;
}

export function SonicRestaurantResult({
  state,
  room,
  playerId,
  ranking,
  onRestart,
  onLeave,
}: SonicRestaurantResultProps) {
  return (
    <GameRankingResult
      ranking={ranking}
      room={room}
      playerId={playerId}
      accentColor={C.primary}
      renderPlayerDetail={(id) => {
        const handCount = state.hands[id]?.length || 0;
        return handCount === 0 ? "上がり" : `残り ${handCount}枚`;
      }}
      onRestart={onRestart}
      onLeave={onLeave}
    />
  );
}
