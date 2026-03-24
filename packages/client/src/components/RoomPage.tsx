import { useEffect, useRef } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { Z } from "../styles/tokens";
import { GameView } from "./GameView";
import { NameEntryModal } from "./NameEntryModal";
import { Room } from "./Room";

/**
 * /room/:code に対応するオーバーレイコンポーネント。
 * Lobby は Layout 側で常時マウントされているため、ここでは Room/GameView のみ返す。
 *
 * - playerName 未設定 → NameEntryModal（Lobby内でも表示されるが、ブロックアウト防止のためここでも返す）
 * - room.status === "waiting" → Room（待機室モーダル、Lobby を背景にオーバーレイ）
 * - room.status === "playing" | "finished" → GameView
 * - ブラウザ戻る/先に進む → skipBlockerRef が false なら確認ダイアログ
 */
export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const {
    playerName,
    room,
    isCreatingRoom,
    connectToRoom,
    proceedLeave,
    errorMsg,
    clearError,
    forfeitNotification,
    clearForfeitNotification,
  } = useRoom();
  // マウント時点で room が既にセットされていれば接続済みとみなす
  // （joinRoom 等で room がセットされた後に RoomPage がマウントされるケースに対応）
  const connectAttempted = useRef(room !== null);
  const navigate = useNavigate();

  // playerName が確定し、まだ接続していなければ接続を試みる（1回のみ）
  useEffect(() => {
    if (!code || !playerName || room || connectAttempted.current) return;
    connectAttempted.current = true;
    connectToRoom(code, playerName);
  }, [code, playerName, room, connectToRoom]);

  // ブラウザの「戻る/進む」（POP ナビゲーション）のみブロックして確認ダイアログを挟む。
  // leaveRoom() や navigate() による PUSH/REPLACE は素通りさせる。
  const blocker = useBlocker(
    ({ historyAction }) =>
      historyAction === "POP" && (!!room || isCreatingRoom),
  );

  useEffect(() => {
    if (!forfeitNotification) return;
    const timer = setTimeout(() => clearForfeitNotification(), 5000);
    return () => clearTimeout(timer);
  }, [forfeitNotification, clearForfeitNotification]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const confirmed = window.confirm("ルームを退出しますか？");
    if (confirmed) {
      proceedLeave();
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, proceedLeave]);

  // playerName 未設定 → NameEntryModal をオーバーレイ
  if (!playerName) {
    return <NameEntryModal />;
  }

  const toast = forfeitNotification ? (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm pointer-events-none animate-fade-in"
      style={{ zIndex: Z.invite }}
    >
      {forfeitNotification}
    </div>
  ) : null;

  // ゲーム中 or 終了
  if (room && (room.status === "playing" || room.status === "finished")) {
    return (
      <>
        {toast}
        <GameView />
      </>
    );
  }

  // 待機室 → Room モーダルのみ（Lobby は Layout 側で常時表示中）
  if (room?.status === "waiting") {
    return <Room />;
  }

  // エラー → Lobby の上に fixed でオーバーレイ
  if (errorMsg) {
    return (
      <div className="fixed inset-0 z-room-error flex flex-col items-center justify-center gap-4 bg-white/90 px-6 text-center font-inter backdrop-blur-sm">
        <div className="text-base text-red-600">{errorMsg}</div>
        <button
          onClick={() => {
            clearError();
            navigate("/");
          }}
          className="cursor-pointer rounded-lg border-0 bg-indigo-600 px-6 py-2 text-[15px] text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          ロビーに戻る
        </button>
      </div>
    );
  }

  // 接続中: Lobby が背景に表示されるので null を返す
  return null;
}
