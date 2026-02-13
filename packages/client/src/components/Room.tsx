import { useEffect } from "react";
import { useRoom } from "../context/RoomContext";
import { getGameDefinition } from "@bodobako/shared";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* ── Injected styles for modal animations ── */
const INJECTED_STYLES = `
@keyframes room-bounceIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(.85); }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes room-fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.room-start-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.room-start-btn:active:not(:disabled) {
  transform: translateY(0);
}
.room-leave-btn:hover {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "room-modal-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = INJECTED_STYLES;
    document.head.appendChild(tag);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}

export function Room() {
  useInjectStyles();
  const { room, playerId, startGame, leaveRoom } = useRoom();
  if (!room) return null;

  const gameDef = getGameDefinition(room.gameId);
  const gameName = gameDef?.name ?? room.gameId;
  const minPlayers = gameDef?.minPlayers ?? 2;
  const maxPlayers = gameDef?.maxPlayers ?? 2;
  const isHost = playerId === room.hostId;
  const canStart = isHost && room.players.length >= minPlayers;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Game name */}
        <div style={styles.gameName}>{gameName}</div>

        {/* Room code */}
        <div style={styles.codeLabel}>ルームコード</div>
        <div style={styles.code}>{room.code}</div>
        <p style={styles.hint}>このコードを相手に伝えてください</p>

        {/* Player list */}
        <div style={styles.playersSection}>
          <div style={styles.playersTitle}>
            プレイヤー ({room.players.length}/{maxPlayers})
          </div>
          <div style={styles.playersList}>
            {room.players.map((p) => (
              <div key={p.id} style={styles.playerCapsule}>
                {p.name}
                {p.id === room.hostId && (
                  <span style={styles.hostBadge}>ホスト</span>
                )}
              </div>
            ))}
          </div>
          {room.players.length < minPlayers && (
            <div style={styles.waiting}>相手を待っています...</div>
          )}
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          {isHost ? (
            <button
              className="room-start-btn"
              style={{
                ...styles.startBtn,
                opacity: canStart ? 1 : 0.5,
                cursor: canStart ? "pointer" : "not-allowed",
              }}
              onClick={startGame}
              disabled={!canStart}
            >
              ゲーム開始
            </button>
          ) : (
            <div style={styles.waitingHost}>
              ホストがゲームを開始するのを待っています...
            </div>
          )}
          <button
            className="room-leave-btn"
            style={styles.leaveBtn}
            onClick={leaveRoom}
          >
            退出する
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 1000,
    animation: "room-fadeIn .25s ease",
  },
  modal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#fff",
    borderRadius: 16,
    padding: "36px 40px",
    width: 400,
    maxWidth: "calc(100% - 48px)",
    boxSizing: "border-box",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontFamily: FONT,
    color: "#2d3748",
    animation: "room-bounceIn .4s ease both",
  },
  gameName: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: "0.8rem",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  code: {
    fontSize: "2.2rem",
    fontWeight: 700,
    letterSpacing: "0.3em",
    padding: "8px 24px",
    background: "#f0f4f8",
    borderRadius: 10,
    color: "#2d3748",
  },
  hint: {
    color: "#a0aec0",
    fontSize: "0.82rem",
    margin: "2px 0 8px 0",
  },
  playersSection: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    margin: "8px 0",
  },
  playersTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#4a5568",
  },
  playersList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  playerCapsule: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    background: "#edf2f7",
    borderRadius: 20,
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  hostBadge: {
    fontSize: "0.7rem",
    fontWeight: 600,
    background: "#4a6fa5",
    color: "#fff",
    borderRadius: 6,
    padding: "1px 6px",
  },
  waiting: {
    color: "#a0aec0",
    fontStyle: "italic",
    fontSize: "0.85rem",
  },
  buttons: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },
  startBtn: {
    width: "100%",
    padding: "12px 0",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    background: "#4a6fa5",
    color: "#fff",
    cursor: "pointer",
    transition: "filter .15s ease, transform .1s ease",
  },
  waitingHost: {
    textAlign: "center",
    color: "#718096",
    fontSize: "0.9rem",
    padding: "8px 0",
  },
  leaveBtn: {
    width: "100%",
    padding: "10px 0",
    fontSize: "0.9rem",
    fontWeight: 500,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "transparent",
    color: "#718096",
    cursor: "pointer",
    transition: "background .15s ease, color .15s ease",
  },
};
