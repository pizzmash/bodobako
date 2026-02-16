import type { CitychaseMove, CitychasePlayerView, RoomInfo } from "@bodobako/shared";
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
        className={isMyTurn ? "cc-glass-panel cc-pulse" : "cc-glass-panel"}
        style={{
          ...styles.turnGuide,
          borderColor: isMyTurn
            ? state.phase === "criminal-setup"
              ? "rgba(220, 38, 38, 0.5)"
              : "rgba(37, 140, 244, 0.5)"
            : "rgba(100, 116, 139, 0.3)",
          color: isMyTurn ? "#ffffff" : "#94a3b8",
          boxShadow: isMyTurn
            ? state.phase === "criminal-setup"
              ? "0 0 20px rgba(220, 38, 38, 0.3)"
              : "0 0 20px rgba(37, 140, 244, 0.3)"
            : "0 2px 8px rgba(0,0,0,.3)",
        }}
      >
        {state.phase === "police-setup"
          ? isMyTurn
            ? (<span className="cc-text-tactical" style={{ fontSize: "0.8rem" }}>
                [H{state.currentHelicopterIndex + 1}] ヘリ #{state.currentHelicopterIndex + 1} を配置する交差点をクリック
              </span>)
            : `${currentPlayer?.name ?? "他のプレイヤー"}がヘリコプターを配置中...`
          : isMyTurn
            ? (<span className="cc-text-tactical" style={{ fontSize: "0.8rem" }}>
                [TARGET] 潜伏するビルをクリックしてください
              </span>)
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
    maxWidth: 900,
  },
  turnGuide: {
    padding: "0.7rem 1.2rem",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "1rem",
    border: "1px solid",
  },
};
