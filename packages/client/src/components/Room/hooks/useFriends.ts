import { useCallback, useState } from "react";
import { API_BASE } from "../../../lib/socket";

export interface Friend {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface Follower extends Friend {
  isFollowing: boolean;
}

export function useFriends(idToken: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const loadFriends = useCallback(async () => {
    if (!idToken) {
      setFriends([]);
      return;
    }
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/followers`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const followers = (await res.json()) as Follower[];
        setFriends(
          followers
            .filter((f) => f.isFollowing)
            .map(({ uid, displayName, photoURL }) => ({ uid, displayName, photoURL })),
        );
      } else {
        setFriends([]);
      }
    } catch {
      setFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [idToken]);

  return { friends, isLoadingFriends, loadFriends };
}
