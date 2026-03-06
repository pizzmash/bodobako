import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { API_BASE } from "../../../lib/socket";

export type FriendRelation = "none" | "outgoing" | "incoming" | "friend";

function computeRelation(
  uid: string,
  followingSet: Set<string>,
  followerMap: Map<string, boolean>,
): FriendRelation {
  const followerIsFollowing = followerMap.get(uid);
  if (followerIsFollowing === true) return "friend";
  if (followingSet.has(uid)) return "outgoing";
  if (followerMap.has(uid)) return "incoming";
  return "none";
}

/**
 * ルーム内プレイヤーとのフレンド関係を管理するフック。
 * sendFriendRequest / approveFriendRequest を提供する。
 */
export function useFriendRelations(
  players: Array<{ userId?: string }> | null,
  idToken: string | null,
  firebaseUser: User | null,
) {
  const [relationByUid, setRelationByUid] = useState<Record<string, FriendRelation>>({});

  useEffect(() => {
    if (!players || !idToken || !firebaseUser) {
      setRelationByUid({});
      return;
    }

    let canceled = false;
    void (async () => {
      try {
        const [followingRes, followersRes] = await Promise.all([
          fetch(`${API_BASE}/users/me/friends`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(`${API_BASE}/users/me/followers`, {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
        ]);

        if (!followingRes.ok || !followersRes.ok || canceled) return;

        const following = (await followingRes.json()) as Array<{ uid: string }>;
        const followers = (await followersRes.json()) as Array<{
          uid: string;
          isFollowing: boolean;
        }>;

        const followingSet = new Set(following.map((f) => f.uid));
        const followerMap = new Map(followers.map((f) => [f.uid, f.isFollowing]));

        const next: Record<string, FriendRelation> = {};
        for (const player of players) {
          const uid = player.userId;
          if (!uid || uid === firebaseUser.uid) continue;
          next[uid] = computeRelation(uid, followingSet, followerMap);
        }
        if (!canceled) setRelationByUid(next);
      } catch {
        if (!canceled) setRelationByUid({});
      }
    })();

    return () => {
      canceled = true;
    };
  }, [players, idToken, firebaseUser]);

  const setRelation = (uid: string, relation: FriendRelation) => {
    setRelationByUid((prev) => ({ ...prev, [uid]: relation }));
  };

  return { relationByUid, setRelation };
}
