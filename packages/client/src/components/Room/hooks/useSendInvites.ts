import { useCallback, useState } from "react";
import { API_BASE } from "../../../lib/socket";

export function useSendInvites(idToken: string | null, roomCode: string) {
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const resetStatus = useCallback(() => {
    setInviteError(null);
    setInviteSuccess(null);
  }, []);

  const sendInvites = useCallback(
    async (selectedUids: string[], onSuccess: () => void) => {
      if (!idToken || selectedUids.length === 0) return;
      setIsSendingInvites(true);
      setInviteError(null);
      setInviteSuccess(null);
      try {
        const res = await fetch(`${API_BASE}/rooms/${roomCode}/invites`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invitedUids: selectedUids }),
        });
        const body = (await res.json()) as { created?: number; error?: string };
        if (!res.ok) {
          setInviteError(body.error ?? "招待の送信に失敗しました");
          return;
        }
        setInviteSuccess(`${body.created ?? 0}人に招待を送りました`);
        onSuccess();
      } catch {
        setInviteError("招待の送信に失敗しました");
      } finally {
        setIsSendingInvites(false);
      }
    },
    [idToken, roomCode],
  );

  return { isSendingInvites, inviteError, inviteSuccess, sendInvites, resetStatus };
}
