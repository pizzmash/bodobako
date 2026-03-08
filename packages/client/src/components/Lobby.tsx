import { getAllGames } from "@bodobako/shared";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { ROOM_CODE_LENGTH } from "../lib/constants";
import { GameIdenticon } from "./Lobby/GameIdenticon";
import { useLobbyInvites } from "./Lobby/hooks/useLobbyInvites";
import { NameEntryModal } from "./NameEntryModal";

const games = getAllGames();
const GAMES_PER_PAGE = 6;

export function Lobby() {
  const { playerName, createRoom, joinRoom, errorMsg, clearError } = useRoom();
  const { idToken } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { inviteQueue, isLoadingInvites, markInviteRead, dismissCurrentInvite } =
    useLobbyInvites(idToken);
  const currentInvite = inviteQueue[0] ?? null;

  const filteredGames = useMemo(
    () =>
      games.filter((g) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
      }),
    [searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PER_PAGE));
  const pagedGames = useMemo(
    () => filteredGames.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE),
    [filteredGames, currentPage],
  );

  const handleCreate = (gameId: string) => {
    createRoom(playerName, gameId);
  };

  const handleJoinFromInvite = async () => {
    if (!currentInvite || !playerName.trim()) return;
    try {
      await markInviteRead(currentInvite.inviteId);
    } catch {
      // ignore
    }
    void dismissCurrentInvite(currentInvite);
    joinRoom(currentInvite.roomCode, playerName);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName);
  };

  return (
    <>
      {!playerName && <NameEntryModal />}

      {/* Invite notice */}
      {currentInvite && (
        <div
          className="fixed inset-0 pointer-events-none z-invite flex items-start justify-center pt-[76px]"
          role="dialog"
          aria-modal="true"
          aria-label="招待通知"
        >
          <div className="pointer-events-auto w-[min(480px,calc(100vw-32px))] bg-white/96 backdrop-blur-xl rounded-[18px] border-2 border-indigo-200/50 shadow-[0_14px_36px_rgba(99,102,241,0.22)] p-4 flex flex-col gap-2">
            <span className="self-start text-[0.75rem] text-indigo-700 bg-indigo-100/80 px-2 py-1 rounded-full font-bold">
              招待が届いています
            </span>
            <div className="text-[1.1rem] font-bold text-indigo-900 font-poppins">ルーム招待</div>
            <p className="m-0 text-indigo-700 text-[0.93rem] leading-[1.55]">
              {currentInvite.inviterName}さんから
              {games.find((g) => g.id === currentInvite.gameId)?.name ?? "ゲーム"}
              への招待が届きました。
            </p>
            <div className="text-[0.88rem] font-bold text-indigo-600">
              ルームコード: {currentInvite.roomCode}
            </div>
            {inviteQueue.length > 1 && (
              <div className="text-[0.8rem] text-indigo-500 font-semibold">
                残り {inviteQueue.length - 1} 件の招待があります
              </div>
            )}
            <div className="flex justify-end gap-2.5 mt-0.5">
              <button
                className="min-h-[44px] cursor-pointer rounded-xl border border-indigo-200/60 bg-white px-3.5 py-2.5 font-poppins font-semibold text-indigo-600 transition duration-200 hover:-translate-y-px hover:bg-indigo-50/90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                onClick={() => void dismissCurrentInvite(currentInvite)}
                disabled={isLoadingInvites}
              >
                閉じる
              </button>
              <button
                className="min-h-[44px] cursor-pointer rounded-xl border-0 bg-indigo-gradient px-4 py-2.5 font-poppins font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition duration-200 hover:-translate-y-px hover:bg-indigo-gradient-deep hover:shadow-[0_8px_24px_rgba(99,102,241,0.4)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                onClick={() => void handleJoinFromInvite()}
                disabled={!playerName.trim()}
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-lobby-shell pt-6 text-indigo-900">
        {/* Background decorations */}
        <div className="pointer-events-none absolute -right-[5%] -top-[10%] z-0 h-[500px] w-[500px] rounded-full bg-lobby-orb-indigo" />
        <div className="pointer-events-none absolute -bottom-[15%] -left-[8%] z-0 h-[600px] w-[600px] rounded-full bg-lobby-orb-violet" />

        {/* Error banner */}
        {errorMsg && (
          <div
            className="relative z-10 mb-4 w-[calc(100%-48px)] max-w-[752px] cursor-pointer rounded-2xl border-2 border-red-300/30 bg-error-banner px-6 py-3 text-center text-[0.95rem] font-semibold text-red-800 shadow-[0_4px_12px_rgba(239,68,68,0.15)] backdrop-blur-xl"
            onClick={clearError}
          >
            {errorMsg}（クリックで閉じる）
          </div>
        )}

        {/* Search bar */}
        <div className="w-full max-w-[800px] px-6 mb-4 relative z-10">
          <div className="relative w-full">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
                stroke="#6366F1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              className="w-full rounded-2xl border-2 border-indigo-200/20 bg-white/70 py-3.5 pl-12 pr-4 text-base text-indigo-900 shadow-[0_4px_12px_rgba(99,102,241,0.08)] outline-none backdrop-blur-xl transition duration-200 focus:border-indigo-500 focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1),0_4px_12px_rgba(99,102,241,0.15)]"
              placeholder="ゲームを検索..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="ゲーム検索"
              type="search"
            />
          </div>
        </div>

        {/* Game cards grid */}
        <div className="relative z-10 flex w-full max-w-[800px] flex-wrap gap-4 px-6">
          {pagedGames.map((g, i) => (
            <div
              key={g.id}
              className="relative flex w-[360px] max-w-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-[20px] border-2 border-indigo-200/20 bg-white/80 p-6 shadow-[0_8px_24px_rgba(99,102,241,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset] backdrop-blur-xl animate-fade-in-up transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-indigo-500/40 hover:bg-white/95 hover:shadow-[0_20px_40px_rgba(99,102,241,0.25),0_0_0_1px_rgba(129,140,248,0.3)] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-indigo-500"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center gap-3.5">
                <GameIdenticon gameId={g.id} />
                <div className="flex flex-col gap-0.5">
                  <div className="text-xl font-semibold font-poppins text-indigo-600 tracking-tight">
                    {g.name}
                  </div>
                  <div className="text-[0.85rem] text-indigo-400 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full self-start">
                    {g.minPlayers === g.maxPlayers
                      ? `${g.minPlayers}人`
                      : `${g.minPlayers}-${g.maxPlayers}人`}
                  </div>
                </div>
              </div>
              <p className="text-[0.9rem] text-purple-900/80 m-0 leading-relaxed">
                {g.description}
              </p>
              <button
                className="relative mt-auto min-h-[48px] cursor-pointer overflow-hidden rounded-xl border-0 bg-indigo-gradient py-3.5 font-poppins text-base font-semibold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3),0_0_0_1px_rgba(255,255,255,0.2)_inset] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-gradient-deep hover:shadow-[0_8px_24px_rgba(99,102,241,0.4),0_0_0_1px_rgba(129,140,248,0.5)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-0"
                onClick={() => handleCreate(g.id)}
                aria-label={`${g.name}のルームを作成`}
              >
                ルームを作成
              </button>
            </div>
          ))}
          {filteredGames.length === 0 && (
            <div className="py-12 px-6 text-indigo-400 text-base text-center font-medium w-full">
              該当するゲームが見つかりませんでした
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
            <button
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-indigo-200/50 bg-white/70 font-poppins text-base font-semibold text-indigo-600 shadow-[0_2px_6px_rgba(99,102,241,0.08)] transition duration-150 hover:-translate-y-px hover:bg-indigo-500/10 hover:text-indigo-600 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:opacity-35 backdrop-blur-md"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="前のページ"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) =>
              page === currentPage ? (
                <button
                  key={page}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-0 bg-indigo-gradient font-poppins text-base font-semibold text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)] transition duration-150 hover:-translate-y-px hover:bg-indigo-gradient-deep focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  onClick={() => setCurrentPage(page)}
                  aria-label={`${page}ページ目`}
                  aria-current="page"
                >
                  {page}
                </button>
              ) : (
                <button
                  key={page}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-indigo-200/50 bg-white/70 font-poppins text-base font-semibold text-indigo-600 shadow-[0_2px_6px_rgba(99,102,241,0.08)] transition duration-150 hover:-translate-y-px hover:bg-indigo-500/10 hover:text-indigo-600 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 backdrop-blur-md"
                  onClick={() => setCurrentPage(page)}
                  aria-label={`${page}ページ目`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-indigo-200/50 bg-white/70 font-poppins text-base font-semibold text-indigo-600 shadow-[0_2px_6px_rgba(99,102,241,0.08)] transition duration-150 hover:-translate-y-px hover:bg-indigo-500/10 hover:text-indigo-600 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:opacity-35 backdrop-blur-md"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="次のページ"
            >
              ›
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="relative z-10 flex w-full max-w-[800px] items-center gap-4 px-6 py-6">
          <div className="h-0.5 flex-1 rounded-sm bg-lobby-divider" />
          <span className="text-[0.9rem] text-indigo-400 shrink-0 font-semibold px-2">
            ルームコードで参加
          </span>
          <div className="h-0.5 flex-1 rounded-sm bg-lobby-divider" />
        </div>

        {/* Join room section */}
        <div className="relative z-10 flex w-full max-w-[480px] flex-col gap-2.5 px-6 sm:flex-row">
          <input
            className="min-h-[48px] min-w-0 flex-1 rounded-2xl border-2 border-indigo-200/50 bg-white/70 px-4 py-3.5 text-center font-poppins text-[1.1rem] font-semibold uppercase tracking-[0.2em] text-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.08)] outline-none backdrop-blur-xl transition duration-200 focus:border-indigo-500 focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1),0_4px_12px_rgba(99,102,241,0.15)]"
            placeholder="例: A3K9"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={ROOM_CODE_LENGTH}
            aria-label="ルームコード入力"
            type="text"
            inputMode="text"
          />
          <button
            className="min-h-[48px] shrink-0 cursor-pointer whitespace-nowrap rounded-2xl border-0 bg-green-gradient px-8 py-3.5 font-poppins text-base font-semibold text-white shadow-[0_4px_12px_rgba(34,197,94,0.35),0_0_0_1px_rgba(255,255,255,0.2)_inset] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-green-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleJoin}
            disabled={!roomCode.trim()}
            aria-label="ルームに参加"
          >
            参加する
          </button>
        </div>

        <div className="h-12" />
      </div>
    </>
  );
}
