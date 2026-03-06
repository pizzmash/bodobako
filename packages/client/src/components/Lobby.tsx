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
                className="lobby-modal-btn border border-indigo-200/60 rounded-xl px-3.5 py-2.5 bg-white text-indigo-600 font-semibold font-poppins min-h-[44px] cursor-pointer"
                onClick={() => void dismissCurrentInvite(currentInvite)}
                disabled={isLoadingInvites}
              >
                閉じる
              </button>
              <button
                className="lobby-modal-btn border-0 rounded-xl px-4 py-2.5 text-white font-bold font-poppins min-h-[44px] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.3)] bg-indigo-gradient"
                onClick={() => void handleJoinFromInvite()}
                disabled={!playerName.trim()}
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex flex-col items-center min-h-screen pt-6 relative overflow-hidden text-indigo-900"
        style={{
          background: "linear-gradient(135deg, #EEF2FF 0%, #F8FAFE 50%, #FAF5FF 100%)",
        }}
      >
        {/* Background decorations */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-10%",
            right: "-5%",
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-15%",
            left: "-8%",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />

        {/* Error banner */}
        {errorMsg && (
          <div
            className="backdrop-blur-xl text-red-800 px-6 py-3 rounded-2xl cursor-pointer max-w-[752px] w-[calc(100%-48px)] text-center text-[0.95rem] font-semibold border-2 border-red-300/30 mb-4 shadow-[0_4px_12px_rgba(239,68,68,0.15)] relative z-10"
            style={{
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.1) 100%)",
            }}
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
              className="lobby-search-input w-full py-3.5 pl-12 pr-4 text-base rounded-2xl border-2 border-indigo-200/20 outline-none bg-white/70 backdrop-blur-xl text-indigo-900 shadow-[0_4px_12px_rgba(99,102,241,0.08)] box-border"
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
        <div className="flex flex-wrap gap-4 w-full max-w-[800px] px-6 box-border relative z-10">
          {pagedGames.map((g, i) => (
            <div
              key={g.id}
              className="lobby-card bg-white/80 backdrop-blur-xl rounded-[20px] border-2 border-indigo-200/20 p-6 w-[360px] max-w-full box-border shadow-[0_8px_24px_rgba(99,102,241,0.12),0_0_0_1px_rgba(255,255,255,0.5)_inset] flex flex-col gap-3.5 animate-fade-in-up cursor-pointer relative overflow-hidden"
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
                className="lobby-create-btn py-3.5 text-base font-semibold font-poppins rounded-xl border-0 text-white cursor-pointer mt-auto min-h-[48px] shadow-[0_4px_12px_rgba(99,102,241,0.3),0_0_0_1px_rgba(255,255,255,0.2)_inset] relative overflow-hidden bg-indigo-gradient"
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
              className="lobby-page-btn w-10 h-10 rounded-xl border border-indigo-200/50 bg-white/70 backdrop-blur-md text-indigo-600 text-base font-semibold font-poppins cursor-pointer flex items-center justify-center shadow-[0_2px_6px_rgba(99,102,241,0.08)]"
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
                  className="lobby-page-btn w-10 h-10 rounded-xl border-0 text-white text-base font-semibold font-poppins cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.35)] bg-indigo-gradient"
                  onClick={() => setCurrentPage(page)}
                  aria-label={`${page}ページ目`}
                  aria-current="page"
                >
                  {page}
                </button>
              ) : (
                <button
                  key={page}
                  className="lobby-page-btn w-10 h-10 rounded-xl border border-indigo-200/50 bg-white/70 backdrop-blur-md text-indigo-600 text-base font-semibold font-poppins cursor-pointer flex items-center justify-center shadow-[0_2px_6px_rgba(99,102,241,0.08)]"
                  onClick={() => setCurrentPage(page)}
                  aria-label={`${page}ページ目`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              className="lobby-page-btn w-10 h-10 rounded-xl border border-indigo-200/50 bg-white/70 backdrop-blur-md text-indigo-600 text-base font-semibold font-poppins cursor-pointer flex items-center justify-center shadow-[0_2px_6px_rgba(99,102,241,0.08)]"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="次のページ"
            >
              ›
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="flex items-center gap-4 w-full max-w-[800px] px-6 py-6 box-border relative z-10">
          <div
            className="flex-1 h-0.5 rounded-sm"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(129,140,248,0.3) 20%, rgba(129,140,248,0.3) 80%, transparent)",
            }}
          />
          <span className="text-[0.9rem] text-indigo-400 shrink-0 font-semibold px-2">
            ルームコードで参加
          </span>
          <div
            className="flex-1 h-0.5 rounded-sm"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(129,140,248,0.3) 20%, rgba(129,140,248,0.3) 80%, transparent)",
            }}
          />
        </div>

        {/* Join room section */}
        <div className="lobby-join-section flex gap-2.5 w-full max-w-[480px] px-6 box-border relative z-10">
          <input
            className="lobby-join-input flex-1 min-w-0 py-3.5 px-4 text-[1.1rem] rounded-2xl border-2 border-indigo-200/50 outline-none box-border text-center tracking-[0.2em] font-semibold font-poppins text-indigo-600 min-h-[48px] uppercase bg-white/70 backdrop-blur-xl shadow-[0_4px_12px_rgba(99,102,241,0.08)]"
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
            className="lobby-join-btn py-3.5 px-8 text-base font-semibold font-poppins rounded-2xl border-0 text-white cursor-pointer whitespace-nowrap shrink-0 min-h-[48px] shadow-[0_4px_12px_rgba(34,197,94,0.35),0_0_0_1px_rgba(255,255,255,0.2)_inset]"
            style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}
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
