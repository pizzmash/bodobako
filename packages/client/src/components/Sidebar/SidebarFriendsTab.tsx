import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FRIEND_CODE_INPUT_MAX_LENGTH } from "../../lib/constants";
import { Spinner } from "../ui/Spinner";
import type { Follower } from "./FriendsList";
import { FriendsList } from "./FriendsList";
import type { FriendsDataHandle } from "./hooks/useFriendsData";

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

interface SidebarFriendsTabProps {
  isActive: boolean;
  friendsData: FriendsDataHandle;
}

export function SidebarFriendsTab({ isActive, friendsData }: SidebarFriendsTabProps) {
  const { firebaseUser, idToken, friendCode } = useAuth();
  const [friendsSubTab, setFriendsSubTab] = useState<"mutual" | "outgoing" | "incoming">(
    "mutual",
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
    } catch {
      const el = document.createElement("textarea");
      el.value = friendCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const {
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
  } = friendsData;

  useEffect(() => {
    if (isActive && firebaseUser && idToken) {
      void loadFollowing();
      void loadFollowers();
    }
  }, [isActive, firebaseUser, idToken, loadFollowing, loadFollowers]);

  useEffect(() => {
    if (!firebaseUser) clearData();
  }, [firebaseUser, clearData]);

  return (
    <div className="px-5 py-3.5">
      {/* フレンドコード */}
      {friendCode && (
        <>
          <div className="text-[0.75rem] font-semibold text-indigo-500 uppercase tracking-[0.08em] mb-2">
            フレンドコード
          </div>
          <div className="flex items-center gap-2 mb-3 bg-indigo-50/60 border border-indigo-200/40 rounded-xl px-3 py-2">
            <span
              className="flex-1 font-mono text-[1.05rem] font-bold text-indigo-600 tracking-[0.12em] select-all"
              aria-label={`フレンドコード: ${friendCode}`}
            >
              {friendCode.slice(0, 4)}-{friendCode.slice(4)}
            </span>
            <button
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-indigo-400 transition duration-150 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.92]"
              onClick={() => void handleCopy()}
              aria-label={copied ? "コピーしました" : "フレンドコードをコピー"}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[0.78rem] text-green-500 font-medium -mt-1.5 mb-3" role="status">
              クリップボードにコピーしました
            </p>
          )}
          <div className="h-px bg-indigo-100/30 -mx-5 mb-3" />
        </>
      )}

      {/* フレンド追加フォーム */}
      <div className="text-[0.75rem] font-semibold text-indigo-500 uppercase tracking-[0.08em] mb-2">
        フレンド申請
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 rounded-xl border border-indigo-200/50 bg-indigo-50/40 px-3 py-2.5 font-mono text-[0.9rem] font-semibold tracking-[0.06em] text-indigo-600 outline-none transition duration-150 focus:border-indigo-500 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
          value={addCode}
          onChange={(e) => {
            setAddCode(e.target.value);
            setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAddFriend();
          }}
          placeholder="ABCD-EFGH"
          maxLength={FRIEND_CODE_INPUT_MAX_LENGTH}
          type="text"
          aria-label="追加するフレンドのコード"
        />
        <button
          className="flex min-h-[40px] min-w-[64px] shrink-0 items-center justify-center gap-1 rounded-xl border-0 bg-indigo-500 px-3.5 py-2.5 font-poppins text-[0.85rem] font-semibold text-white transition duration-200 hover:bg-indigo-600 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleAddFriend()}
          disabled={isAdding || addCode.trim() === ""}
          aria-busy={isAdding}
        >
          {isAdding ? (
            <Spinner size={13} colorClass="border-white/40 border-t-white" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          申請
        </button>
      </div>
      {addError && (
        <p className="text-[0.8rem] text-red-500 mt-1.5 mb-0" role="alert">
          {addError}
        </p>
      )}
      {addSuccess && (
        <p className="text-[0.8rem] text-green-500 font-medium mt-1.5 mb-0" role="status">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="inline mr-1 align-middle"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {addSuccess} に申請しました
        </p>
      )}

      {/* 操作エラーバナー */}
      {actionError && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 mt-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[0.8rem]"
          role="alert"
        >
          <span>{actionError}</span>
          <button
            className="text-red-400 hover:text-red-600 shrink-0 border-0 bg-transparent p-0 leading-none"
            onClick={() => setActionError(null)}
            aria-label="エラーを閉じる"
          >
            ✕
          </button>
        </div>
      )}

      {/* サブタブ */}
      <div className="flex gap-2 mt-[18px]">
        {(["mutual", "outgoing", "incoming"] as const).map((tab) => {
          const active = friendsSubTab === tab;
          const count =
            tab === "mutual"
              ? mutualFriends.length
              : tab === "outgoing"
                ? outgoingRequests.length
                : incomingRequests.length;
          return (
            <button
              key={tab}
              className={`flex items-center gap-1.5 rounded-full border-0 px-3.5 py-1.5 text-[0.82rem] font-poppins transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                active
                  ? "bg-indigo-500 text-white font-bold shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
                  : "bg-[rgba(238,242,255,0.7)] text-indigo-400 font-medium"
              }`}
              onClick={() => setFriendsSubTab(tab)}
              aria-selected={active}
              role="tab"
            >
              {tab === "mutual" ? "フレンド" : tab === "outgoing" ? "申請中" : "承認待ち"}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[16px] h-4 rounded-full px-1 text-[0.68rem] font-bold ${
                    active ? "bg-white/25 text-white" : "bg-indigo-500/15 text-indigo-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* リスト */}
      <div className="mt-3.5">
        {friendsSubTab === "mutual" && (
          <FriendsList
            loading={followingLoading}
            items={mutualFriends}
            emptyTitle="まだフレンドがいません"
            emptySubTitle="申請を承認するとフレンドになります"
            renderActions={(f) => (
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-slate-300 transition duration-150 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void handleRemove(f.uid)}
                disabled={removingUid === f.uid}
                aria-label={`${f.displayName} をフレンド削除`}
                title="フレンド削除"
              >
                {removingUid === f.uid ? (
                  <Spinner size={14} colorClass="border-slate-200 border-t-slate-400" />
                ) : (
                  <TrashIcon />
                )}
              </button>
            )}
          />
        )}
        {friendsSubTab === "outgoing" && (
          <FriendsList
            loading={followingLoading || followersLoading}
            items={outgoingRequests}
            emptyTitle="申請中のユーザーはいません"
            emptySubTitle="フレンドコードで申請できます"
            renderActions={(f) => (
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-slate-300 transition duration-150 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void handleCancelRequest(f.uid)}
                disabled={cancelingUid === f.uid}
                aria-label={`${f.displayName} への申請を取り下げ`}
                title="申請取り下げ"
              >
                {cancelingUid === f.uid ? (
                  <Spinner size={14} colorClass="border-slate-200 border-t-slate-400" />
                ) : (
                  <TrashIcon />
                )}
              </button>
            )}
          />
        )}
        {friendsSubTab === "incoming" && (
          <FriendsList
            loading={followersLoading}
            items={incomingRequests}
            emptyTitle="承認待ちの申請はありません"
            emptySubTitle="申請が届くとここに表示されます"
            renderActions={(f) => (
              <div className="flex gap-2">
                <button
                  className="flex min-h-[30px] shrink-0 items-center gap-1 rounded-lg border-0 bg-indigo-500 px-2.5 py-1.5 font-poppins text-[0.78rem] font-semibold text-white transition duration-150 hover:bg-indigo-600 hover:shadow-[0_2px_8px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleApproveRequest(f as Follower)}
                  disabled={approvingUid === f.uid}
                  aria-label={`${f.displayName} の申請を承認`}
                  title="承認"
                >
                  {approvingUid === f.uid && (
                    <Spinner size={12} colorClass="border-white/40 border-t-white" />
                  )}
                  承認
                </button>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-slate-300 transition duration-150 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => void handleRejectRequest(f.uid)}
                  disabled={rejectingUid === f.uid}
                  aria-label={`${f.displayName} の申請を拒否`}
                  title="拒否"
                >
                  {rejectingUid === f.uid ? (
                    <Spinner size={14} colorClass="border-slate-200 border-t-slate-400" />
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
