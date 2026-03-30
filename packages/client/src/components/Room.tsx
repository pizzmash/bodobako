import { getAllGames, getGameDefinition } from "@bodobako/shared";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { Z } from "../styles/tokens";
import { InviteModal } from "./Room/InviteModal";
import { Modal } from "./ui/Modal";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-indigo-400 transition duration-150 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.92]"
      aria-label={copied ? "コピーしました" : "ルームコードをコピー"}
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
  );
}

export function Room() {
  const { room, playerId, startGame, leaveRoom, isCreatingRoom, creatingGameId } = useRoom();
  const { idToken } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // ローディング中はスピナー付きモーダルを表示
  if (isCreatingRoom && !room) {
    const allGames = getAllGames();
    const pendingGame = creatingGameId ? allGames.find((g) => g.id === creatingGameId) : null;
    return (
      <Modal zIndex={Z.modal}>
        <div className="bg-white rounded-2xl px-10 py-9 w-[400px] max-w-[calc(100vw-48px)] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col items-center gap-2 text-gray-700 animate-bounce-in">
          <div className="text-xl font-bold mb-1">{pendingGame?.name ?? "ゲーム"}</div>

          {/* 二重リングスピナー */}
          <div className="relative w-[88px] h-[88px] my-3 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-indigo-500 border-r-indigo-400 animate-spin" />
            <div className="absolute inset-[14px] rounded-full border-[3px] border-gray-200 border-b-indigo-300 border-l-indigo-200 animate-[spin_0.75s_cubic-bezier(0.4,0,0.2,1)_infinite_reverse]" />
            <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 shadow-[0_2px_8px_rgba(99,102,241,0.5)]" />
          </div>

          <div className="text-lg font-bold text-indigo-600 mt-2 text-center">
            <span className="room-loading-dots">ルームを作成中</span>
          </div>
          <div className="text-[0.82rem] text-gray-400 text-center mt-0.5">
            サーバーに接続しています
          </div>
        </div>
      </Modal>
    );
  }

  if (!room) return null;

  const gameDef = getGameDefinition(room.gameId);
  const gameName = gameDef?.name ?? room.gameId;
  const minPlayers = gameDef?.minPlayers ?? 2;
  const maxPlayers = gameDef?.maxPlayers ?? 2;
  const isHost = playerId === room.hostId;
  const canStart = isHost && room.players.length >= minPlayers;

  const openInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  return (
    <>
      <Modal zIndex={Z.modal}>
        <div className="bg-white rounded-2xl px-10 py-9 w-[400px] max-w-[calc(100vw-48px)] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col items-center gap-2 text-gray-700 animate-bounce-in">
          {/* ゲーム名 */}
          <div className="text-xl font-bold mb-1">{gameName}</div>

          {/* ルームコード */}
          <div className="text-[0.8rem] text-gray-500 uppercase tracking-[0.1em]">ルームコード</div>
          <div className="flex items-center text-[2.2rem] font-bold tracking-[0.3em] px-6 py-2 bg-gray-100 rounded-xl text-gray-700">
            {room.code}
            <CopyButton text={room.code} />
          </div>
          <p className="text-gray-400 text-[0.82rem] m-0 mb-2">
            このコードを相手に伝えてください
          </p>

          {/* プレイヤーリスト */}
          <div className="w-full flex flex-col items-center gap-2 my-2">
            <div className="text-[0.85rem] font-semibold text-gray-600">
              プレイヤー ({room.players.length}{maxPlayers != null ? `/${maxPlayers}` : ""})
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 rounded-full text-[0.9rem] font-medium"
                >
                  {p.name}
                  {p.id === room.hostId && (
                    <span className="rounded-md bg-room-host px-1.5 py-px text-[0.7rem] font-semibold text-white">
                      ホスト
                    </span>
                  )}
                </div>
              ))}
            </div>
            {room.players.length < minPlayers && (
              <div className="text-gray-400 italic text-[0.85rem]">相手を待っています...</div>
            )}
          </div>

          {/* ボタン群 */}
          <div className="w-full flex flex-col gap-2 mt-2">
            {isHost ? (
              <>
                <button
                  className="w-full rounded-xl border-0 bg-room-host py-3 text-base font-semibold text-white transition-[filter,transform] duration-150 hover:brightness-110 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-room-host active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={startGame}
                  disabled={!canStart}
                >
                  ゲーム開始
                </button>
                {idToken && (
                  <button
                    className="min-h-[44px] w-full cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-[0.92rem] font-semibold text-indigo-700 transition duration-150 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    onClick={openInviteModal}
                  >
                    フレンドを招待
                  </button>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 text-[0.9rem] py-2">
                ホストがゲームを開始するのを待っています...
              </div>
            )}
            <button
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-transparent py-2.5 text-[0.9rem] font-medium text-gray-500 transition-[background,color] duration-150 hover:bg-red-100 hover:text-red-600 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              onClick={leaveRoom}
            >
              退出する
            </button>
          </div>
        </div>
      </Modal>

      {isInviteModalOpen && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          idToken={idToken}
          roomCode={room.code}
        />
      )}
    </>
  );
}
