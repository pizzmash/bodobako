import { useEffect } from "react";
import type { CitychasePlayerView, CitychaseMove } from "@bodobako/shared";
import type { RoomInfo } from "@bodobako/shared";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
}

const CSS_ID = "cc-role-styles";
const INJECTED_CSS = `
.cc-role-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(37,99,235,.25) !important;
}
.cc-role-btn:active {
  transform: translateY(0) !important;
}
`;

export function RoleSelect({ state, playerId, room, sendMove }: Props) {
  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const tag = document.createElement("style");
    tag.id = CSS_ID;
    tag.textContent = INJECTED_CSS;
    document.head.appendChild(tag);
    return () => { document.getElementById(CSS_ID)?.remove(); };
  }, []);

  const isHost = playerId === room.hostId;

  if (!isHost) {
    return (
      <div style={styles.section}>
        <div style={styles.waitCard}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎭</div>
          <p style={styles.waitText}>ホストが犯人を選んでいます...</p>
          <div style={styles.playerChips}>
            {state.playerIds.map((pid) => {
              const p = room.players.find((pl) => pl.id === pid);
              return (
                <span key={pid} style={styles.chip}>
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
        <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>🎭</div>
        犯人役のプレイヤーを選んでください
      </div>
      <div style={styles.playerList}>
        {state.playerIds.map((pid) => {
          const player = room.players.find((p) => p.id === pid);
          return (
            <button
              key={pid}
              className="cc-role-btn"
              style={styles.playerButton}
              onClick={() => sendMove({ type: "assign-criminal", targetId: pid })}
            >
              <span style={styles.btnIcon}>🎯</span>
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
    color: "#475569",
    marginBottom: "1rem",
    fontWeight: 600,
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    alignItems: "center",
  },
  playerButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1.25rem",
    fontSize: "1rem",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    background: "white",
    color: "#1e293b",
    cursor: "pointer",
    minWidth: 240,
    transition: "all 0.15s",
    fontWeight: 600,
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
  },
  btnIcon: {
    fontSize: "1.2rem",
  },
  btnName: {
    flex: 1,
    textAlign: "left",
  },
  btnArrow: {
    color: "#94a3b8",
    fontSize: "1.1rem",
  },
  youTag: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#6366f1",
    background: "#eef2ff",
    padding: "0.1rem 0.3rem",
    borderRadius: 4,
    marginLeft: "0.4rem",
    verticalAlign: "middle",
  },
  waitCard: {
    padding: "2rem",
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
  },
  waitText: {
    fontSize: "1rem",
    color: "#64748b",
    fontWeight: 600,
    margin: "0 0 1rem",
  },
  playerChips: {
    display: "flex",
    gap: "0.4rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  chip: {
    fontSize: "0.8rem",
    padding: "0.2rem 0.6rem",
    borderRadius: 8,
    background: "#e2e8f0",
    color: "#475569",
    fontWeight: 600,
  },
};
