import { PLAYER_COLORS } from "../../lib/color";
import type { GameLogItem } from "../../hooks/useGameLog";

function getPlayerColor(playerId: string, players: { id: string }[]): string {
  const index = players.findIndex((p) => p.id === playerId);
  if (index < 0) return PLAYER_COLORS[0];
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export function LogPanel({
  logs,
  players,
}: {
  logs: GameLogItem[];
  players: { id: string; name: string }[];
}) {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#94a3b8",
          marginBottom: 12,
        }}
      >
        ゲームログ
      </div>
      {logs.length === 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          まだログはありません
        </div>
      )}
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="nana-log-entry"
          style={{ display: "flex", gap: 6, marginBottom: 8, fontSize: 12 }}
        >
          <span
            style={{
              color: getPlayerColor(entry.playerId, players),
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {entry.playerName}:
          </span>
          <span style={{ color: "#64748b", lineHeight: 1.4 }}>
            {entry.tag && (
              <span
                style={{
                  color: entry.tagColor ?? "#64748b",
                  fontWeight: 800,
                  marginRight: 6,
                }}
              >
                [{entry.tag}]
              </span>
            )}
            {entry.message}
          </span>
        </div>
      ))}
    </div>
  );
}
