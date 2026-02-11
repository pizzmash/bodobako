import { useRoom } from "../context/RoomContext";
import { getGameDefinition } from "@claude-demo/shared";

export function Room() {
  const { room, playerId, startGame } = useRoom();
  if (!room) return null;

  const gameDef = getGameDefinition(room.gameId);
  const minPlayers = gameDef?.minPlayers ?? 2;
  const maxPlayers = gameDef?.maxPlayers ?? 2;
  const isHost = playerId === room.hostId;
  const canStart = isHost && room.players.length >= minPlayers;

  return (
    <div style={styles.container}>
      <h2>ルーム待機中</h2>
      <div style={styles.code}>
        ルームコード: <strong>{room.code}</strong>
      </div>
      <p style={styles.hint}>このコードを相手に伝えてください</p>

      <div style={styles.players}>
        <h3>プレイヤー ({room.players.length}/{maxPlayers})</h3>
        {room.players.map((p) => (
          <div key={p.id} style={styles.player}>
            {p.name} {p.id === room.hostId ? "(ホスト)" : ""}
          </div>
        ))}
        {room.players.length < minPlayers && (
          <div style={styles.waiting}>相手を待っています...</div>
        )}
      </div>

      {isHost && (
        <button
          style={{
            ...styles.button,
            opacity: canStart ? 1 : 0.5,
          }}
          onClick={startGame}
          disabled={!canStart}
        >
          ゲーム開始
        </button>
      )}
      {!isHost && <p>ホストがゲームを開始するのを待っています...</p>}
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
  code: {
    fontSize: "2rem",
    padding: "1rem 2rem",
    background: "#f0f0f0",
    borderRadius: "12px",
    margin: "1rem 0",
    letterSpacing: "0.3em",
  },
  hint: {
    color: "#888",
    fontSize: "0.9rem",
  },
  players: {
    margin: "2rem 0",
    textAlign: "center",
  },
  player: {
    padding: "0.5rem",
    fontSize: "1.1rem",
  },
  waiting: {
    color: "#aaa",
    fontStyle: "italic",
    padding: "0.5rem",
  },
  button: {
    padding: "0.75rem 2rem",
    fontSize: "1.1rem",
    borderRadius: "8px",
    border: "none",
    background: "#4a90d9",
    color: "#fff",
    cursor: "pointer",
  },
};
