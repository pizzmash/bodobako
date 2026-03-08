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
    <div className="flex flex-col gap-2 w-full mb-4">
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
        borderRadius: 10,
        padding: "0.6rem 0.9rem",
        transition: "all 0.3s",
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: isCurrentTurn
          ? `0 0 0 1px ${accentColor}, 0 4px 16px ${accentColor}44`
          : "0 2px 8px rgba(0,0,0,.3)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={isCurrentTurn ? (isCriminal ? "cc-dot-danger cc-pulse-danger" : "cc-dot-primary cc-pulse") : ""}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: isCurrentTurn ? accentColor : "rgba(100, 116, 139, 0.4)",
              boxShadow: isCurrentTurn ? `0 0 8px ${accentColor}` : "none",
            }}
          />
          <span className="text-[0.9rem] font-bold text-white tracking-[0.02em]">
            {player?.name ?? pid}
            {isMe && (
              <span className="cc-you-badge">YOU</span>
            )}
          </span>
          {isCurrentTurn && (
            <span
              className="cc-text-tactical text-[0.65rem] font-bold"
              style={{ color: accentColor }}
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
        <div className="flex gap-[0.4rem] mt-[0.4rem]">
          {heliIndices.map((hi) => {
            const color = HELI_COLORS[hi % HELI_COLORS.length];
            return (
            <span
              key={hi}
              style={{
                fontSize: "0.65rem",
                padding: "0.15rem 0.5rem",
                borderRadius: 6,
                transition: "all 0.2s",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: "0.05em",
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
