import type { PlayerCardStyle } from "@bodobako/shared";
import { useEffect, useState } from "react";
import { API_BASE } from "../../../lib/socket";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  cardStyle?: PlayerCardStyle;
}

/**
 * ルームプレイヤーのプロフィールを uid → profile でキャッシュするフック。
 * room が null になるとキャッシュをクリアする。
 */
export function useParticipantProfiles(
  players: Array<{ userId?: string }> | null,
): [Record<string, UserProfile>, (uid: string, profile: UserProfile) => void] {
  const [profilesByUid, setProfilesByUid] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!players) {
      setProfilesByUid({});
      return;
    }

    const userIds = Array.from(
      new Set(players.map((p) => p.userId).filter((uid): uid is string => Boolean(uid))),
    );
    if (userIds.length === 0) {
      setProfilesByUid({});
      return;
    }

    let canceled = false;
    void (async () => {
      const results = await Promise.all(
        userIds.map(async (uid) => {
          try {
            const res = await fetch(`${API_BASE}/users/${uid}/profile`);
            if (!res.ok) return null;
            const profile = (await res.json()) as UserProfile;
            return [uid, profile] as const;
          } catch {
            return null;
          }
        }),
      );

      if (canceled) return;
      const next: Record<string, UserProfile> = {};
      for (const row of results) {
        if (!row) continue;
        next[row[0]] = row[1];
      }
      setProfilesByUid(next);
    })();

    return () => {
      canceled = true;
    };
  }, [players]);

  const setProfile = (uid: string, profile: UserProfile) => {
    setProfilesByUid((prev) => ({ ...prev, [uid]: profile }));
  };

  return [profilesByUid, setProfile];
}
