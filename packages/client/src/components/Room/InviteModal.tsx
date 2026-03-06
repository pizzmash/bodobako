import { useEffect, useMemo, useState } from "react";
import { Z } from "../../styles/tokens";
import { Avatar } from "../ui/Avatar";
import { useFriends } from "./hooks/useFriends";
import { useSendInvites } from "./hooks/useSendInvites";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  idToken: string | null;
  roomCode: string;
}

export function InviteModal({ isOpen, onClose, idToken, roomCode }: InviteModalProps) {
  const [friendSearch, setFriendSearch] = useState("");
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);

  const { friends, isLoadingFriends, loadFriends } = useFriends(idToken);
  const { isSendingInvites, inviteError, inviteSuccess, sendInvites, resetStatus } =
    useSendInvites(idToken, roomCode);

  useEffect(() => {
    if (!isOpen) return;
    resetStatus();
    setFriendSearch("");
    setSelectedFriendUids([]);
    void loadFriends();
  }, [isOpen, loadFriends, resetStatus]);

  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((f) => f.displayName.toLowerCase().includes(query));
  }, [friends, friendSearch]);

  const selectedFriendUidsSet = useMemo(() => new Set(selectedFriendUids), [selectedFriendUids]);

  const toggleFriend = (uid: string) => {
    setSelectedFriendUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const selectAllFiltered = () => {
    setSelectedFriendUids((prev) => {
      const merged = new Set(prev);
      for (const f of filteredFriends) merged.add(f.uid);
      return Array.from(merged);
    });
  };

  const handleSendInvites = () => {
    void sendInvites(selectedFriendUids, () => {
      setSelectedFriendUids([]);
      setFriendSearch("");
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur"
      style={{ zIndex: Z.inviteModal }}
    >
      <div className="w-[min(620px,100%)] max-h-[min(760px,calc(100vh-32px))] bg-white rounded-2xl border border-blue-100 shadow-[0_24px_56px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-gray-200">
          <div>
            <div className="text-[1.05rem] font-bold text-indigo-900">フレンドを招待</div>
            <div className="mt-1 text-[0.82rem] text-indigo-500 font-semibold">
              {selectedFriendUids.length}人選択中
            </div>
          </div>
          <button
            className="border border-gray-300 bg-white rounded-xl min-h-[44px] px-3 py-2.5 text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>

        {/* 検索 */}
        <input
          className="room-invite-search mx-4 mt-3 w-[calc(100%-32px)] rounded-xl border-[1.5px] border-gray-300 min-h-[44px] px-3 py-2.5 text-[0.92rem] box-border"
          placeholder="フレンド名 / コードで検索"
          value={friendSearch}
          onChange={(e) => setFriendSearch(e.target.value)}
          type="search"
        />

        {/* アクション行 */}
        <div className="flex flex-wrap gap-2 px-4 py-2.5">
          <button
            className="min-h-[40px] rounded-xl border-0 bg-indigo-100 text-indigo-700 px-3 py-2 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default"
            onClick={selectAllFiltered}
            disabled={filteredFriends.length === 0}
          >
            表示中を全選択
          </button>
          <button
            className="min-h-[40px] rounded-xl border border-gray-300 bg-white text-gray-600 px-3 py-2 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
            onClick={() => setSelectedFriendUids([])}
            disabled={selectedFriendUids.length === 0}
          >
            選択解除
          </button>
        </div>

        {/* フレンドリスト */}
        <div className="px-4 pb-3 max-h-[320px] overflow-y-auto flex flex-col gap-2">
          {isLoadingFriends ? (
            <div className="text-center py-5 text-gray-500 font-semibold text-[0.88rem]">
              フレンドを読み込み中です...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-5 text-gray-500 font-semibold text-[0.88rem]">
              一致するフレンドがいません
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <label
                key={friend.uid}
                className="room-invite-item flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedFriendUidsSet.has(friend.uid)}
                  onChange={() => toggleFriend(friend.uid)}
                  className="w-5 h-5 m-0 shrink-0 accent-indigo-500"
                />
                <Avatar photoURL={friend.photoURL} displayName={friend.displayName} size={32} />
                <div className="min-w-0 flex flex-col">
                  <div className="text-[0.9rem] font-bold text-gray-900 truncate">
                    {friend.displayName}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {inviteError && (
          <div className="mx-4 text-red-600 bg-red-50 border border-red-200 rounded-xl px-2.5 py-2 text-[0.84rem] font-semibold">
            {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div className="mx-4 text-green-800 bg-green-50 border border-green-200 rounded-xl px-2.5 py-2 text-[0.84rem] font-semibold">
            {inviteSuccess}
          </div>
        )}

        {/* フッター */}
        <div className="px-4 pt-3 pb-4 border-t border-gray-200 flex justify-end">
          <button
            className="min-h-[44px] rounded-xl border-0 bg-indigo-600 text-white font-bold px-4 py-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSendInvites}
            disabled={selectedFriendUids.length === 0 || isSendingInvites}
          >
            {isSendingInvites ? "送信中..." : "招待を送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
