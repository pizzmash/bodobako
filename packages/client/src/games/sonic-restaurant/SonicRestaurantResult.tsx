/**
 * 音速飯店 - リザルト画面
 */

import type { Player, RoomInfo, SonicRestaurantState } from "@bodobako/shared";
import { GameRankingResult } from "../../components/GameRankingResult";
import { C } from "./constants";

interface SonicRestaurantResultProps {
  state: SonicRestaurantState;
  room: RoomInfo;
  playerId: string;
  ranking: string[];
  players?: Player[];
  onRestart: () => void;
  onLeave: () => void;
  rematchRequests?: string[];
  minPlayers?: number;
  onRematchRequest?: () => void;
}

export function SonicRestaurantResult({
  state,
  room,
  playerId,
  ranking,
  players,
  onRestart,
  onLeave,
  rematchRequests,
  minPlayers,
  onRematchRequest,
}: SonicRestaurantResultProps) {
  return (
    <GameRankingResult
      ranking={ranking}
      room={room}
      playerId={playerId}
      players={players}
      accentColor={C.primary}
      renderPlayerDetail={(id) => {
        const handCount = state.hands[id]?.length || 0;
        return handCount === 0 ? "上がり" : `残り ${handCount}枚`;
      }}
      onRestart={onRestart}
      onLeave={onLeave}
      rematchRequests={rematchRequests}
      minPlayers={minPlayers}
      onRematchRequest={onRematchRequest}
    />
  );
}
