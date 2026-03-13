import { getHelicoptersForPlayer } from "@bodobako/shared";
import type { CitychasePlayerView } from "@bodobako/shared";
import type { PlayerSlotProps } from "../../components/GameSidebar/PlayerCard";
import { useRoom } from "../../context/RoomContext";
import { HELI_COLORS } from "./constants";

export function CitychasePlayerSlot({ playerId: slotPlayerId, isMe }: PlayerSlotProps) {
  const { gameState } = useRoom();
  const state = (gameState?.gameId === "citychase" ? gameState.state : null) as CitychasePlayerView | null;
  if (!state) return null;

  // role-select フェーズはロール未確定なので表示なし
  if (state.phase === "role-select") return null;

  // 役割判定（自分: playerView.isCriminal、他人: 公開情報から）
  const isCriminal = isMe ? state.isCriminal : state.criminalId === slotPlayerId;
  const isPolice = isMe ? !state.isCriminal : state.policeIds.includes(slotPlayerId);
  const roleUnknown = !isCriminal && !isPolice;

  const accentColor = isCriminal ? "#ef4444" : "#3b82f6";

  // ヘリコプター担当インデックス（警察のみ）
  const heliIndices = isPolice ? getHelicoptersForPlayer(state.helicopterAssignments, slotPlayerId) : [];

  // アクティブヘリ判定（警察ターン中かつ手番のプレイヤー）
  const isPolicePhase = state.phase === "police-turn" || state.phase === "police-setup";
  const isCurrentTurnPlayer = isPolicePhase && state.policeIds[state.currentPoliceIndex] === slotPlayerId;
  const activeHelicopterIndex = isCurrentTurnPlayer ? state.currentHelicopterIndex : undefined;

  if (roleUnknown) {
    return (
      <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
        ?
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      {/* 役割バッジ */}
      <span
        className="text-xs font-bold"
        style={{ color: accentColor, fontFamily: "'Orbitron', monospace", letterSpacing: "0.05em" }}
      >
        {isCriminal ? "FUGITIVE" : "POLICE"}
      </span>

      {/* ヘリコプター担当バッジ（警察のみ） */}
      {heliIndices.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {heliIndices.map((hi) => {
            const color = HELI_COLORS[hi % HELI_COLORS.length];
            const isActive = activeHelicopterIndex === hi;
            return (
              <span
                key={hi}
                style={{
                  fontSize: "0.6rem",
                  padding: "0.1rem 0.4rem",
                  borderRadius: 4,
                  fontFamily: "'Orbitron', monospace",
                  letterSpacing: "0.05em",
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? color : `${color}33`,
                  color: isActive ? "white" : color,
                  border: `1px solid ${color}99`,
                  boxShadow: isActive ? `0 0 8px ${color}66` : "none",
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
