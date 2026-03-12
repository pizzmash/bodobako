import type { ComponentType } from "react";
import { useRoom } from "../context/RoomContext";
import type { GameLogItem } from "../hooks/useGameLog";
import { LogPanel } from "./GameSidebar/LogPanel";
import { PlayerCard } from "./GameSidebar/PlayerCard";
import type { PlayerSlotProps } from "./GameSidebar/PlayerCard";

interface GameSidebarContentProps {
  logEntries: GameLogItem[];
  PlayerSlot?: ComponentType<PlayerSlotProps>;
  currentTurnPlayerId: string | null;
}

export function GameSidebarContent({
  logEntries,
  PlayerSlot,
  currentTurnPlayerId,
}: GameSidebarContentProps) {
  const { room, playerId } = useRoom();

  if (!room) return null;

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* プレイヤーリスト */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#94a3b8",
            marginBottom: 8,
          }}
        >
          プレイヤー
        </div>
        {room.players.map((player, index) => {
          const isMe = player.id === playerId;
          const isCurrentPlayer =
            currentTurnPlayerId === null
              ? null
              : player.id === currentTurnPlayerId;
          return (
            <PlayerCard
              key={player.id}
              playerId={player.id}
              playerName={player.name}
              colorIndex={index}
              isMe={isMe}
              isCurrentPlayer={isCurrentPlayer}
            >
              {PlayerSlot && (
                <PlayerSlot
                  playerId={player.id}
                  isMe={isMe}
                  isCurrentPlayer={isCurrentPlayer}
                />
              )}
            </PlayerCard>
          );
        })}
      </div>

      {/* ゲームログ */}
      <div className="flex-1 overflow-y-auto">
        <LogPanel logs={logEntries} players={room.players} />
      </div>
    </div>
  );
}
