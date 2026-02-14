import type { CitychasePlayerView, CitychaseMove } from "@bodobako/shared";
import type { RoomInfo } from "@bodobako/shared";
import { BoardGrid } from "./BoardGrid";
import { PlayerPanel } from "./PlayerPanel";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
}

export function SetupPhase({ state, playerId, room, sendMove }: Props) {
  const isCriminal = state.isCriminal;
  const isMyTurn =
    state.phase === "criminal-setup"
      ? isCriminal
      : state.policeIds[state.currentPoliceIndex] === playerId;

  const currentPlayer = room.players.find(
    (p) =>
      p.id ===
      (state.phase === "criminal-setup"
        ? state.criminalId
        : state.policeIds[state.currentPoliceIndex])
  );

  return (
    <div style={styles.section}>
      {/* プレイヤーパネル */}
      <PlayerPanel state={state} playerId={playerId} room={room} />

      {/* ターン案内 */}
      <div
        style={{
          ...styles.turnGuide,
          background:
            isMyTurn
              ? state.phase === "criminal-setup"
                ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                : "linear-gradient(135deg, #2563eb, #1d4ed8)"
              : "#f1f5f9",
          color: isMyTurn ? "white" : "#64748b",
          border: isMyTurn ? "none" : "1px solid #e2e8f0",
        }}
      >
        {state.phase === "police-setup"
          ? isMyTurn
            ? `🚁 ヘリ #${state.currentHelicopterIndex + 1} を配置する交差点をクリック`
            : `${currentPlayer?.name ?? "他のプレイヤー"}がヘリコプターを配置中...`
          : isMyTurn
            ? "🚗 潜伏するビルをクリックしてください"
            : "犯人が潜伏先を選んでいます..."}
      </div>

      <BoardGrid
        state={state}
        playerId={playerId}
        onIntersectionClick={
          state.phase === "police-setup" && isMyTurn
            ? (pos) => sendMove({ type: "place-helicopter", pos })
            : undefined
        }
        onBuildingClick={
          state.phase === "criminal-setup" && isMyTurn
            ? (pos) => sendMove({ type: "place-criminal", pos })
            : undefined
        }
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    textAlign: "center",
    padding: "0.5rem",
    width: "100%",
  },
  turnGuide: {
    padding: "0.5rem 1rem",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
};
