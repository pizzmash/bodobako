import type { CitychasePlayerView } from "@bodobako/shared";
import type { RoomInfo } from "@bodobako/shared";
import { getHelicoptersForPlayer } from "@bodobako/shared";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
}

const HELI_COLORS = ["#2563eb", "#059669", "#d97706"];

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
          helicopterAssignments={state.helicopterAssignments}
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
            helicopterAssignments={state.helicopterAssignments}
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
  helicopterAssignments: string[];
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
  const accentColor = isCriminal ? "#dc2626" : "#2563eb";

  return (
    <div
      style={{
        ...styles.card,
        borderLeft: `4px solid ${accentColor}`,
        background: isCurrentTurn
          ? isCriminal
            ? "#fef2f2"
            : "#eff6ff"
          : isMe
            ? "#f8fafc"
            : "#ffffff",
        boxShadow: isCurrentTurn
          ? `0 0 0 1px ${accentColor}33, 0 2px 8px ${accentColor}22`
          : "0 1px 3px rgba(0,0,0,.08)",
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.nameRow}>
          <span
            style={{
              ...styles.dot,
              background: isCurrentTurn ? accentColor : "#cbd5e0",
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
              style={{
                ...styles.turnLabel,
                color: accentColor,
              }}
            >
              ◀ ラウンド
            </span>
          )}
        </div>
        <span
          style={{
            ...styles.roleBadge,
            background: isCriminal ? "#fee2e2" : "#dbeafe",
            color: isCriminal ? "#dc2626" : "#2563eb",
          }}
        >
          {isCriminal ? "犯人" : "警察"}
        </span>
      </div>

      {/* ヘリ担当表示（警察のみ） */}
      {heliIndices.length > 0 && (
        <div style={styles.heliRow}>
          {heliIndices.map((hi) => (
            <span
              key={hi}
              style={{
                ...styles.heliBadge,
                background:
                  activeHelicopterIndex === hi
                    ? HELI_COLORS[hi % HELI_COLORS.length]
                    : `${HELI_COLORS[hi % HELI_COLORS.length]}22`,
                color:
                  activeHelicopterIndex === hi
                    ? "white"
                    : HELI_COLORS[hi % HELI_COLORS.length],
                border: `1px solid ${HELI_COLORS[hi % HELI_COLORS.length]}66`,
                fontWeight: activeHelicopterIndex === hi ? 800 : 600,
              }}
            >
              🚁 {hi + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "100%",
    marginBottom: "0.75rem",
  },
  card: {
    borderRadius: 10,
    padding: "0.5rem 0.75rem",
    transition: "all 0.2s",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
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
    color: "#1e293b",
  },
  youLabel: {
    fontSize: "0.6rem",
    fontWeight: 800,
    color: "#6366f1",
    background: "#eef2ff",
    padding: "0.1rem 0.3rem",
    borderRadius: 4,
    marginLeft: "0.3rem",
    verticalAlign: "middle",
  },
  turnLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
  },
  roleBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.15rem 0.5rem",
    borderRadius: 8,
  },
  heliRow: {
    display: "flex",
    gap: "0.3rem",
    marginTop: "0.3rem",
  },
  heliBadge: {
    fontSize: "0.7rem",
    padding: "0.1rem 0.4rem",
    borderRadius: 6,
  },
};
