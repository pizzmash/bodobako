import { C, FONT } from "./constants";
import type { LogEntry } from "./types";

export function GameLogPanel({
  logs,
  getPlayerColor,
}: {
  logs: LogEntry[];
  getPlayerColor: (pid: string) => string;
}) {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.muted,
          marginBottom: 12,
        }}
      >
        ゲームログ
      </div>
      {logs.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>まだログはありません</div>
      )}
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="nana-log-entry"
          style={{ display: "flex", gap: 6, marginBottom: 8, fontSize: 12 }}
        >
          <span
            style={{
              color: getPlayerColor(entry.playerId),
              fontWeight: 700,
              fontFamily: FONT,
              flexShrink: 0,
            }}
          >
            {entry.player}:
          </span>
          <span style={{ color: "#64748b", fontFamily: FONT, lineHeight: 1.4 }}>
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
            {entry.msg}
          </span>
        </div>
      ))}
    </div>
  );
}
