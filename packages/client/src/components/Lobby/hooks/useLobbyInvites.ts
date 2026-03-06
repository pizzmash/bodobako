import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../../lib/socket";

export interface RoomInvite {
  inviteId: string;
  inviterName: string;
  roomCode: string;
  gameId: string;
  createdAt: number;
}

export function useLobbyInvites(idToken: string | null) {
  const [inviteQueue, setInviteQueue] = useState<RoomInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const loadInvites = useCallback(async () => {
    if (!idToken) {
      setInviteQueue([]);
      return;
    }
    setIsLoadingInvites(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/invites`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setInviteQueue((await res.json()) as RoomInvite[]);
      }
    } catch {
      setInviteQueue([]);
    } finally {
      setIsLoadingInvites(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (!idToken) {
      setInviteQueue([]);
      return;
    }
    void loadInvites();
  }, [idToken, loadInvites]);

  useEffect(() => {
    const handlePageShow = () => {
      void loadInvites();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [loadInvites]);

  const markInviteRead = useCallback(
    async (inviteId: string) => {
      if (!idToken) return;
      await fetch(
        `${API_BASE}/users/me/invites/${encodeURIComponent(inviteId)}/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
    },
    [idToken],
  );

  const dismissCurrentInvite = useCallback(
    async (currentInvite: RoomInvite) => {
      try {
        await markInviteRead(currentInvite.inviteId);
      } catch {
        // ignore
      }
      setInviteQueue((prev) => prev.slice(1));
    },
    [markInviteRead],
  );

  return { inviteQueue, isLoadingInvites, markInviteRead, dismissCurrentInvite };
}
