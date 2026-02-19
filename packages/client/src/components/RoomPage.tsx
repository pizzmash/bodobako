import { useEffect, useRef } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
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

  // ゲーム中 or 終了
  if (room && (room.status === "playing" || room.status === "finished")) {
    return <GameView />;
  }

  // 待機室 → Room モーダルのみ（Lobby は Layout 側で常時表示中）
  if (room?.status === "waiting") {
    return <Room />;
  }

  // エラー → Lobby の上に fixed でオーバーレイ
  if (errorMsg) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(4px)",
          zIndex: 2000,
          fontFamily: "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
        }}
      >
        <div style={{ color: "#dc2626", fontSize: 16 }}>{errorMsg}</div>
        <button
          onClick={() => {
            clearError();
            navigate("/");
          }}
          style={{
            padding: "8px 24px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 15,
            fontFamily: "inherit",
          }}
        >
          ロビーに戻る
        </button>
      </div>
    );
  }

  // 接続中: Lobby が背景に表示されるので null を返す
  return null;
}
