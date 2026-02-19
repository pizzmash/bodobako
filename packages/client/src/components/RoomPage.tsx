import { useEffect, useRef } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { GameView } from "./GameView";
import { Lobby } from "./Lobby";
import { NameEntryModal } from "./NameEntryModal";
import { Room } from "./Room";

/**
 * /room/:code に対応するページコンポーネント。
 *
 * - playerName 未設定 → NameEntryModal をオーバーレイ表示（入力後に自動接続）
 * - 接続中 → "接続中..." ローディング表示
 * - room.status === "waiting" or isCreatingRoom → Room（待機室）
 * - room.status === "playing" | "finished" → GameView
 * - ブラウザ戻る/前に進む → 確認ダイアログで leaveRoom を挟む
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
  const connectAttempted = useRef(false);
  const navigate = useNavigate();

  // playerName が確定し、まだ接続していなければ接続を試みる（1回のみ）
  useEffect(() => {
    if (!code || !playerName || room || connectAttempted.current) return;
    connectAttempted.current = true;
    connectToRoom(code, playerName);
  }, [code, playerName, room, connectToRoom]);

  // ブラウザの戻る/前に進む をブロックして確認ダイアログを挟む
  const blocker = useBlocker(() => !!room || isCreatingRoom);

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

  // エラー
  if (errorMsg) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 16,
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

  // 待機室 or ルーム作成中 → Lobby を背景に残して Room モーダルをオーバーレイ
  // 接続中（まだ room も isCreatingRoom も false）も Lobby を表示して待機
  return (
    <>
      <Lobby />
      {(isCreatingRoom || (room && room.status === "waiting")) && <Room />}
    </>
  );
}
