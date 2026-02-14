import type {
  CitychasePlayerView,
  CitychaseMove,
  BuildingPos,
  IntersectionPos,
  GameResult,
} from "@bodobako/shared";
import type { RoomInfo } from "@bodobako/shared";
import {
  getAdjacentIntersections,
  getSurroundingBuildings,
  getValidCriminalMoves,
  isSamePos,
} from "@bodobako/shared";
import { BoardGrid } from "./BoardGrid";
import { PlayerPanel } from "./PlayerPanel";
import { GameResultCard } from "../../components/GameResultCard";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
  gameResult: GameResult | null;
  startGame: () => void;
  leaveRoom: () => void;
}

export function GameBoard({
  state,
  playerId,
  room,
  sendMove,
  gameResult,
  startGame,
  leaveRoom,
}: Props) {
  const isCriminal = state.isCriminal;
  const isFinished = !!gameResult;
  const isPolicePhase = state.phase === "police-turn";
  const isCriminalPhase = state.phase === "criminal-turn";
  const currentPoliceId = state.policeIds[state.currentPoliceIndex];
  const isMyPoliceTurn = !isFinished && isPolicePhase && currentPoliceId === playerId;
  const isMyCriminalTurn = !isFinished && isCriminalPhase && isCriminal;

  const currentHeli = state.helicopters[state.currentHelicopterIndex];

  // 移動可能な交差点（警察）
  const moveTargets: IntersectionPos[] =
    isMyPoliceTurn && currentHeli
      ? getAdjacentIntersections(currentHeli).filter(
          (p) =>
            !state.helicopters.some(
              (h, i) =>
                h &&
                i !== state.currentHelicopterIndex &&
                isSamePos(h, p)
            )
        )
      : [];

  // 捜索可能なビル（警察）
  const searchTargets: BuildingPos[] =
    isMyPoliceTurn && currentHeli ? getSurroundingBuildings(currentHeli) : [];

  // 犯人の移動先候補
  const criminalMoveTargets: BuildingPos[] = isMyCriminalTurn
    ? getValidCriminalMoves(
        state as unknown as Parameters<typeof getValidCriminalMoves>[0]
      )
    : [];

  const currentPlayer = room.players.find(
    (p) => p.id === (isPolicePhase ? currentPoliceId : state.criminalId)
  );

  const searchResult = state.lastSearchResult;

  const handleIntersectionClick = (pos: IntersectionPos) => {
    if (isMyPoliceTurn) {
      sendMove({
        type: "move-helicopter",
        helicopterIndex: state.currentHelicopterIndex,
        pos,
      });
    }
  };

  const handleBuildingClick = (pos: BuildingPos) => {
    if (isMyPoliceTurn) {
      sendMove({
        type: "search-building",
        helicopterIndex: state.currentHelicopterIndex,
        pos,
      });
    }
    if (isMyCriminalTurn) {
      sendMove({ type: "move-criminal", pos });
    }
  };

  // ゲーム結果のresult計算
  const getResultType = (): "win" | "lose" => {
    if (isCriminal) {
      return state.winningSide === "criminal" ? "win" : "lose";
    }
    return state.winningSide === "police" ? "win" : "lose";
  };

  const getWinnerName = (): string => {
    if (state.winningSide === "police") {
      return "警察陣営";
    }
    const criminal = room.players.find((p) => p.id === state.criminalId);
    return criminal?.name ?? "犯人";
  };

  return (
    <div style={styles.section}>
      {/* プレイヤーパネル */}
      <PlayerPanel state={state} playerId={playerId} room={room} />

      {/* ステータスバー */}
      <div style={styles.statusBar}>
        <span style={{ ...styles.badge, ...styles.roundBadge }}>
          ラウンド {state.round} / 11
        </span>
        <span
          style={{
            ...styles.badge,
            background: isPolicePhase ? "#dbeafe" : "#fee2e2",
            color: isPolicePhase ? "#1d4ed8" : "#b91c1c",
          }}
        >
          {isPolicePhase ? "🔵 警察フェーズ" : "🔴 犯人フェーズ"}
        </span>
      </div>

      {/* 捜索結果バナー */}
      {searchResult && !searchResult.found && (
        <div
          style={{
            ...styles.searchBanner,
            background: searchResult.traceFound
              ? "linear-gradient(135deg, #fef3c7, #fde68a)"
              : "#f1f5f9",
            borderColor: searchResult.traceFound ? "#f59e0b" : "#cbd5e0",
            color: searchResult.traceFound ? "#92400e" : "#64748b",
          }}
        >
          {searchResult.traceFound ? (
            <>
              <span style={{ fontSize: "1.1rem" }}>⚠</span>
              {searchResult.traceRound !== null
                ? ` 痕跡発見！ ラウンド ${searchResult.traceRound} の痕跡`
                : " 痕跡発見！（ラウンド不明）"}
            </>
          ) : (
            <>
              <span style={{ fontSize: "1.1rem" }}>✓</span> 痕跡なし
            </>
          )}
        </div>
      )}

      {/* ターン案内（ゲーム終了時は非表示） */}
      {!isFinished && (
        <div
          style={{
            ...styles.turnGuide,
            background: isMyPoliceTurn || isMyCriminalTurn
              ? isCriminal
                ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                : "linear-gradient(135deg, #2563eb, #1d4ed8)"
              : "#f1f5f9",
            color: isMyPoliceTurn || isMyCriminalTurn ? "white" : "#64748b",
            border:
              isMyPoliceTurn || isMyCriminalTurn
                ? "none"
                : "1px solid #e2e8f0",
          }}
        >
          {isMyPoliceTurn ? (
            <>
              🚁 ヘリ #{state.currentHelicopterIndex + 1} —{" "}
              <strong>交差点をクリックで移動</strong>、
              <strong>ビルをクリックで捜索</strong>
            </>
          ) : isMyCriminalTurn ? (
            <>🚗 移動先のビルを選択してください</>
          ) : (
            <>{currentPlayer?.name ?? "他のプレイヤー"}の番です</>
          )}
        </div>
      )}

      {/* ボード */}
      <div style={{ marginTop: "0.5rem" }}>
        <BoardGrid
          state={state}
          playerId={playerId}
          onBuildingClick={
            isMyPoliceTurn || isMyCriminalTurn
              ? handleBuildingClick
              : undefined
          }
          onIntersectionClick={
            isMyPoliceTurn ? handleIntersectionClick : undefined
          }
          highlightBuildings={criminalMoveTargets}
          highlightIntersections={moveTargets}
          searchableBuildings={searchTargets}
          activeHelicopterIndex={
            isMyPoliceTurn ? state.currentHelicopterIndex : undefined
          }
        />
      </div>

      {/* 凡例 */}
      <div style={styles.legend}>
        {isMyPoliceTurn && (
          <>
            <LegendItem color="#22c55e" label="移動先" glow />
            <LegendItem color="#f59e0b" label="捜索可能" glow />
          </>
        )}
        {isMyCriminalTurn && <LegendItem color="#22c55e" label="移動先" glow />}
        <LegendItem color="#fbbf24" icon="⚠" label="痕跡あり" />
        <LegendItem color="#16a34a" icon="✓" label="捜索済み" badge />
        {isCriminal && (
          <LegendItem color="#f87171" icon="👣" label="通過済み" />
        )}
      </div>

      {/* ゲーム結果 */}
      {gameResult && (
        <GameResultCard
          result={getResultType()}
          winnerName={getWinnerName()}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}

function LegendItem({
  color,
  icon,
  label,
  glow,
  badge,
}: {
  color: string;
  icon?: string;
  label: string;
  glow?: boolean;
  badge?: boolean;
}) {
  return (
    <div style={styles.legendItem}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: badge ? 3 : 3,
          background: badge ? "rgba(255,255,255,.85)" : glow ? "#64748b" : color,
          fontSize: badge ? "0.5rem" : "0.55rem",
          fontWeight: badge ? 900 : undefined,
          color: badge ? color : undefined,
          boxShadow: glow ? `0 0 0 2px ${color}, 0 0 4px 1px ${color}88` : undefined,
        }}
      >
        {icon ?? ""}
      </span>
      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    textAlign: "center",
    padding: "0.25rem",
    width: "100%",
  },
  statusBar: {
    display: "flex",
    justifyContent: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: 10,
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  roundBadge: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
  },
  searchBanner: {
    padding: "0.5rem 1rem",
    borderRadius: 10,
    margin: "0 0 0.5rem",
    fontSize: "0.9rem",
    fontWeight: 700,
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3rem",
  },
  turnGuide: {
    padding: "0.5rem 1rem",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "0.75rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
};
