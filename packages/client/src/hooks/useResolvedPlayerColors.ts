import type { Player } from "@bodobako/shared";
import { useCallback } from "react";
import { useParticipantProfiles } from "../components/AppHeader/hooks/useParticipantProfiles";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";

/**
 * プレイヤーIDとフォールバックカラーを受け取り、
 * ユーザー設定カラーがあればそちらを優先して返す関数を返すフック。
 *
 * 優先順位: ユーザー設定カラー(cardStyle.accentColor) > fallback
 */
export function useResolvedPlayerColors(players: Player[] | null): (pid: string, fallback: string) => string {
  const { cardStyle: myCardStyle } = useAuth();
  const { playerId } = useRoom();
  const [profilesByUid] = useParticipantProfiles(players);

  return useCallback(
    (pid: string, fallback: string): string => {
      const player = (players ?? []).find((p) => p.id === pid);
      const isMe = pid === playerId;
      const cardStyle = isMe
        ? myCardStyle
        : (player?.userId ? (profilesByUid[player.userId]?.cardStyle ?? null) : null);
      return cardStyle?.accentColor ?? fallback;
    },
    [players, playerId, myCardStyle, profilesByUid],
  );
}
