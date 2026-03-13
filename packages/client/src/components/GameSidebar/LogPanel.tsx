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
    <div className="h-full overflow-y-auto">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-3">
        ゲームログ
      </div>
      {logs.length === 0 && (
        <div className="text-xs text-slate-400">
          まだログはありません
        </div>
      )}
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="nana-log-entry flex gap-1.5 mb-2 text-xs"
        >
          <span
            className="font-bold flex-shrink-0"
            style={{ color: getPlayerColor(entry.playerId, players) }}
          >
            {entry.playerName}:
          </span>
          <span className="text-slate-500 leading-[1.4]">
            {entry.tag && (
              <span
                className="font-extrabold mr-1.5"
                style={{ color: entry.tagColor ?? "#64748b" }}
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
