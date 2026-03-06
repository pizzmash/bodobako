import type { CitychaseMove, CitychasePlayerView, RoomInfo } from "@bodobako/shared";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
}

export function RoleSelect({ state, playerId, room, sendMove }: Props) {

  const isHost = playerId === room.hostId;

  if (!isHost) {
    return (
      <div style={styles.section}>
        <div className="cc-glass-panel" style={styles.waitCard}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#258cf4" }}>[WAIT]</div>
          <p style={styles.waitText}>ホストが犯人を選んでいます...</p>
          <div style={styles.playerChips}>
            {state.playerIds.map((pid) => {
              const p = room.players.find((pl) => pl.id === pid);
              return (
                <span key={pid} className="cc-status-badge-primary" style={styles.chip}>
                  {p?.name ?? pid}
                  {pid === playerId ? " (自分)" : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <div style={styles.description}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontFamily: "'Orbitron', monospace", fontWeight: 900, color: "#dc2626" }}>[SELECT]</div>
        <span className="cc-text-tactical" style={{ fontSize: "0.85rem", color: "#64c3ff" }}>
          犯人役のプレイヤーを選んでください
        </span>
      </div>
      <div style={styles.playerList}>
        {state.playerIds.map((pid) => {
          const player = room.players.find((p) => p.id === pid);
          return (
            <button
              key={pid}
              className="cc-role-btn cc-glass-panel"
              style={styles.playerButton}
              onClick={() => sendMove({ type: "assign-criminal", targetId: pid })}
            >
              <span style={styles.btnIcon}>▶</span>
              <span style={styles.btnName}>
                {player?.name ?? pid}
                {pid === playerId && (
                  <span style={styles.youTag}>YOU</span>
                )}
              </span>
              <span style={styles.btnArrow}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    textAlign: "center",
    padding: "0.5rem",
    width: "100%",
  },
  description: {
    fontSize: "0.95rem",
    color: "#94a3b8",
    marginBottom: "1.5rem",
    fontWeight: 600,
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    alignItems: "center",
  },
  playerButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1.4rem",
    fontSize: "1rem",
    border: "2px solid rgba(37, 140, 244, 0.3)",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    minWidth: 260,
    transition: "all 0.2s",
    fontWeight: 600,
    boxShadow: "0 2px 8px rgba(0,0,0,.3)",
  },
  btnIcon: {
    fontSize: "1rem",
    color: "#258cf4",
    filter: "none",
  },
  btnName: {
    flex: 1,
    textAlign: "left",
    letterSpacing: "0.02em",
  },
  btnArrow: {
    color: "#258cf4",
    fontSize: "1.2rem",
  },
  youTag: {
    fontSize: "0.55rem",
    fontWeight: 800,
    color: "#258cf4",
    background: "rgba(37, 140, 244, 0.15)",
    padding: "0.15rem 0.4rem",
    borderRadius: 4,
    marginLeft: "0.5rem",
    verticalAlign: "middle",
    border: "1px solid rgba(37, 140, 244, 0.3)",
    letterSpacing: "0.05em",
  },
  waitCard: {
    padding: "2.5rem",
    borderRadius: 16,
    maxWidth: 400,
    margin: "0 auto",
  },
  waitText: {
    fontSize: "1rem",
    color: "#94a3b8",
    fontWeight: 600,
    margin: "0 0 1.5rem",
    letterSpacing: "0.02em",
  },
  playerChips: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  chip: {
    fontSize: "0.75rem",
    padding: "0.25rem 0.7rem",
    borderRadius: 8,
    fontWeight: 600,
  },
};
