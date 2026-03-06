import { useCallback, useMemo, useState } from "react";
import { API_BASE } from "../../../lib/socket";
import type { Follower, Friend } from "../FriendsList";

export interface FriendsDataHandle {
  followingLoading: boolean;
  followersLoading: boolean;
  mutualFriends: Follower[];
  outgoingRequests: Friend[];
  incomingRequests: Follower[];
  addCode: string;
  setAddCode: (v: string) => void;
  isAdding: boolean;
  addError: string | null;
  setAddError: (v: string | null) => void;
  addSuccess: string | null;
  actionError: string | null;
  setActionError: (v: string | null) => void;
  removingUid: string | null;
  cancelingUid: string | null;
  approvingUid: string | null;
  rejectingUid: string | null;
  loadFollowing: () => Promise<void>;
  loadFollowers: () => Promise<void>;
  handleAddFriend: () => Promise<void>;
  handleRemove: (uid: string) => Promise<void>;
  handleCancelRequest: (uid: string) => Promise<void>;
  handleApproveRequest: (follower: Follower) => Promise<void>;
  handleRejectRequest: (uid: string) => Promise<void>;
  clearData: () => void;
}

export function useFriendsData(idToken: string | null): FriendsDataHandle {
  const [following, setFollowing] = useState<Friend[] | null>(null);
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [cancelingUid, setCancelingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mutualFriends = useMemo(
    () => (followers ?? []).filter((follower) => follower.isFollowing),
    [followers],
  );

  const outgoingRequests = useMemo(() => {
    const followersSet = new Set((followers ?? []).map((follower) => follower.uid));
    return (following ?? []).filter((friend) => !followersSet.has(friend.uid));
  }, [following, followers]);

  const incomingRequests = useMemo(
    () => (followers ?? []).filter((follower) => !follower.isFollowing),
    [followers],
  );

  const loadFollowing = useCallback(async () => {
    if (!idToken) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setFollowing((await res.json()) as Friend[]);
    } catch {
      /* ignore */
    } finally {
      setFollowingLoading(false);
    }
  }, [idToken]);

  const loadFollowers = useCallback(async () => {
    if (!idToken) return;
    setFollowersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/followers`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setFollowers((await res.json()) as Follower[]);
    } catch {
      /* ignore */
    } finally {
      setFollowersLoading(false);
    }
  }, [idToken]);

  const clearData = useCallback(() => {
    setFollowing(null);
    setFollowers(null);
  }, []);

  const handleAddFriend = async () => {
    const code = addCode.replace(/-/g, "").trim().toUpperCase();
    if (code.length !== 8) {
      setAddError("フレンドコードは8文字で入力してください（例: ABCD-EFGH）");
      return;
    }
    if (!idToken) return;
    setIsAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ friendCode: code }),
      });
      if (!res.ok) {
        setAddError(((await res.json()) as { error: string }).error ?? "追加に失敗しました");
      } else {
        const friend = (await res.json()) as Friend;
        setAddSuccess(friend.displayName);
        setAddCode("");
        setFollowing((prev) => (prev ? [friend, ...prev] : [friend]));
        setFollowers((prev) =>
          prev?.map((f) => (f.uid === friend.uid ? { ...f, isFollowing: true } : f)) ?? null,
        );
        setTimeout(() => setAddSuccess(null), 3000);
      }
    } catch {
      setAddError("ネットワークエラーが発生しました");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!idToken) return;
    setRemovingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friends/${uid}/mutual`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowing((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
        setFollowers((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      } else {
        setActionError("フレンド削除に失敗しました");
      }
    } catch {
      setActionError("フレンド削除に失敗しました");
    } finally {
      setRemovingUid(null);
    }
  };

  const handleCancelRequest = async (uid: string) => {
    if (!idToken) return;
    setCancelingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowing((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      } else {
        setActionError("申請の取り下げに失敗しました");
      }
    } catch {
      setActionError("申請の取り下げに失敗しました");
    } finally {
      setCancelingUid(null);
    }
  };

  const handleApproveRequest = async (follower: Follower) => {
    if (!idToken) return;
    setApprovingUid(follower.uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${follower.uid}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const friend: Friend = {
          uid: follower.uid,
          displayName: follower.displayName,
          friendCode: follower.friendCode,
          photoURL: follower.photoURL,
        };
        setFollowing((prev) => {
          const current = prev ?? [];
          if (current.some((f) => f.uid === friend.uid)) return current;
          return [friend, ...current];
        });
        setFollowers((prev) =>
          prev?.map((f) => (f.uid === follower.uid ? { ...f, isFollowing: true } : f)) ?? null,
        );
      } else {
        setActionError("申請の承認に失敗しました");
      }
    } catch {
      setActionError("申請の承認に失敗しました");
    } finally {
      setApprovingUid(null);
    }
  };

  const handleRejectRequest = async (uid: string) => {
    if (!idToken) return;
    setRejectingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/users/me/friend-requests/${uid}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setFollowers((prev) => prev?.filter((f) => f.uid !== uid) ?? null);
      } else {
        setActionError("申請の拒否に失敗しました");
      }
    } catch {
      setActionError("申請の拒否に失敗しました");
    } finally {
      setRejectingUid(null);
    }
  };

  return {
    followingLoading,
    followersLoading,
    mutualFriends,
    outgoingRequests,
    incomingRequests,
    addCode,
    setAddCode,
    isAdding,
    addError,
    setAddError,
    addSuccess,
    actionError,
    setActionError,
    removingUid,
    cancelingUid,
    approvingUid,
    rejectingUid,
    loadFollowing,
    loadFollowers,
    clearData,
    handleAddFriend,
    handleRemove,
    handleCancelRequest,
    handleApproveRequest,
    handleRejectRequest,
  };
}
