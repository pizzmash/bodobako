import { useState } from "react";
import { useRoom } from "../context/RoomContext";
import { getAllGames } from "@bodobako/shared";

const games = getAllGames();

export function Lobby() {
  const { createRoom, joinRoom, errorMsg, clearError } = useRoom();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id ?? "othello");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");

  const handleCreate = () => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim(), selectedGameId);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ボードゲームオンライン</h1>

      {errorMsg && (
        <div style={styles.error} onClick={clearError}>
          {errorMsg} (クリックで閉じる)
        </div>
      )}

      {mode === "menu" && (
        <div style={styles.menu}>
          <input
            style={styles.input}
            placeholder="プレイヤー名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button style={styles.button} onClick={() => setMode("create")}>
            ルームを作成
          </button>
          <button style={styles.button} onClick={() => setMode("join")}>
            ルームに参加
          </button>
        </div>
      )}

      {mode === "create" && (
        <div style={styles.menu}>
          <p>プレイヤー名: {playerName}</p>
          <div style={styles.gameSelect}>
            {games.map((g) => (
              <button
                key={g.id}
                style={{
                  ...styles.gameButton,
                  background: selectedGameId === g.id ? "#4a90d9" : "#fff",
                  color: selectedGameId === g.id ? "#fff" : "#333",
                }}
                onClick={() => setSelectedGameId(g.id)}
              >
                {g.name}（{g.minPlayers}-{g.maxPlayers}人）
              </button>
            ))}
          </div>
          <button style={styles.button} onClick={handleCreate}>
            作成
          </button>
          <button style={styles.buttonSecondary} onClick={() => setMode("menu")}>
            戻る
          </button>
        </div>
      )}

      {mode === "join" && (
        <div style={styles.menu}>
          <p>プレイヤー名: {playerName}</p>
          <input
            style={styles.input}
            placeholder="ルームコード (例: A3K9)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button style={styles.button} onClick={handleJoin}>
            参加
          </button>
          <button style={styles.buttonSecondary} onClick={() => setMode("menu")}>
            戻る
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "2rem",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "300px",
    alignItems: "center",
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#4a90d9",
    color: "#fff",
    cursor: "pointer",
    width: "100%",
  },
  buttonSecondary: {
    padding: "0.75rem 2rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    width: "100%",
  },
  error: {
    background: "#fee",
    color: "#c00",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    cursor: "pointer",
  },
  gameSelect: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "100%",
  },
  gameButton: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    cursor: "pointer",
    textAlign: "left" as const,
  },
};
