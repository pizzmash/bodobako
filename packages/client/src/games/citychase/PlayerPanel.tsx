import type { CitychasePlayerView, RoomInfo } from "@bodobako/shared";
import { getHelicoptersForPlayer } from "@bodobako/shared";
import { HELI_COLORS } from "./constants";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
}

export function PlayerPanel({ state, playerId, room }: Props) {
  const isPolicePhase = state.phase === "police-turn" || state.phase === "police-setup";
  const currentTurnId = isPolicePhase
    ? state.policeIds[state.currentPoliceIndex]
    : state.criminalId;

  return (
    <div style={styles.container}>
      {/* 犯人カード */}
      {state.criminalId && (
        <PlayerCard
          pid={state.criminalId}
          role="criminal"
          room={room}
          playerId={playerId}
          isCurrentTurn={currentTurnId === state.criminalId}
          heliIndices={[]}
        />
      )}

      {/* 警察カード */}
      {state.policeIds.map((pid) => {
        const helis = getHelicoptersForPlayer(state.helicopterAssignments, pid);
        return (
          <PlayerCard
            key={pid}
            pid={pid}
            role="police"
            room={room}
            playerId={playerId}
            isCurrentTurn={currentTurnId === pid}
            heliIndices={helis}
            activeHelicopterIndex={
              isPolicePhase && currentTurnId === pid
                ? state.currentHelicopterIndex
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

interface PlayerCardProps {
  pid: string;
  role: "criminal" | "police";
  room: RoomInfo;
  playerId: string;
  isCurrentTurn: boolean;
  heliIndices: number[];
  activeHelicopterIndex?: number;
}

function PlayerCard({
  pid,
  role,
  room,
  playerId,
  isCurrentTurn,
  heliIndices,
  activeHelicopterIndex,
}: PlayerCardProps) {
  const player = room.players.find((p) => p.id === pid);
  const isMe = pid === playerId;
  const isCriminal = role === "criminal";
  const accentColor = isCriminal ? "#dc2626" : "#258cf4";

  return (
    <div
      className={isCriminal ? "cc-glass-panel-danger" : "cc-glass-panel"}
      style={{
        ...styles.card,
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: isCurrentTurn
          ? `0 0 0 1px ${accentColor}, 0 4px 16px ${accentColor}44`
          : "0 2px 8px rgba(0,0,0,.3)",
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.nameRow}>
          <span
            className={isCurrentTurn ? (isCriminal ? "cc-dot-danger cc-pulse-danger" : "cc-dot-primary cc-pulse") : ""}
            style={{
              ...styles.dot,
              background: isCurrentTurn ? accentColor : "rgba(100, 116, 139, 0.4)",
              boxShadow: isCurrentTurn ? `0 0 8px ${accentColor}` : "none",
            }}
          />
          <span style={styles.name}>
            {player?.name ?? pid}
            {isMe && (
              <span style={styles.youLabel}>YOU</span>
            )}
          </span>
          {isCurrentTurn && (
            <span
              className="cc-text-tactical"
              style={{
                ...styles.turnLabel,
                color: accentColor,
              }}
            >
              ◀ TURN
            </span>
          )}
        </div>
        <span
          className={`cc-status-badge ${isCriminal ? "cc-status-badge-danger" : "cc-status-badge-primary"}`}
        >
          {isCriminal ? "FUGITIVE" : "POLICE"}
        </span>
      </div>

      {/* ヘリ担当表示（警察のみ） */}
      {heliIndices.length > 0 && (
        <div style={styles.heliRow}>
          {heliIndices.map((hi) => {
            const color = HELI_COLORS[hi % HELI_COLORS.length];
            return (
            <span
              key={hi}
              style={{
                ...styles.heliBadge,
                background:
                  activeHelicopterIndex === hi
                    ? color
                    : `${color}33`,
                color:
                  activeHelicopterIndex === hi
                    ? "white"
                    : color,
                border: `1px solid ${color}99`,
                fontWeight: activeHelicopterIndex === hi ? 800 : 600,
                boxShadow: activeHelicopterIndex === hi ? `0 0 12px ${color}66` : "none",
              }}
            >
              H{hi + 1}
            </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "100%",
    marginBottom: "1rem",
  },
  card: {
    borderRadius: 10,
    padding: "0.6rem 0.9rem",
    transition: "all 0.3s",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  name: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "0.02em",
  },
  youLabel: {
    fontSize: "0.55rem",
    fontWeight: 800,
    color: "#258cf4",
    background: "rgba(37, 140, 244, 0.15)",
    padding: "0.15rem 0.4rem",
    borderRadius: 4,
    marginLeft: "0.3rem",
    verticalAlign: "middle",
    border: "1px solid rgba(37, 140, 244, 0.3)",
    letterSpacing: "0.05em",
  },
  turnLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
  },
  heliRow: {
    display: "flex",
    gap: "0.4rem",
    marginTop: "0.4rem",
  },
  heliBadge: {
    fontSize: "0.65rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 6,
    transition: "all 0.2s",
    fontFamily: "'Orbitron', monospace",
    letterSpacing: "0.05em",
    fontWeight: 700,
  },
};