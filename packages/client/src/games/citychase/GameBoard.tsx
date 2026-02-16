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
        <div className="cc-status-badge" style={styles.roundBadge}>
          <span className="cc-dot-primary" style={{ width: 6, height: 6 }}></span>
          ROUND {state.round} / 11
        </div>
        <div
          className={`cc-status-badge ${isPolicePhase ? "cc-status-badge-primary" : "cc-status-badge-danger"}`}
        >
          {isPolicePhase ? "[P] POLICE PHASE" : "[T] FUGITIVE PHASE"}
        </div>
      </div>

      {/* 捜索結果バナー */}
      {searchResult && !searchResult.found && (
        <div
          className={searchResult.traceFound ? "cc-glass-panel" : "cc-glass-panel"}
          style={{
            ...styles.searchBanner,
            borderColor: searchResult.traceFound ? "#d97706" : "rgba(37, 140, 244, 0.3)",
            color: searchResult.traceFound ? "#fbbf24" : "#64c3ff",
            boxShadow: searchResult.traceFound 
              ? "0 0 20px rgba(217, 119, 6, 0.3), 0 2px 8px rgba(0,0,0,.3)"
              : "0 2px 8px rgba(0,0,0,.3)",
          }}
        >
          {searchResult.traceFound ? (
            <>
              <span style={{ fontSize: "1.1rem", fontWeight: 900, fontFamily: "'Orbitron', monospace" }}>!</span>
              {searchResult.traceRound !== null
                ? ` 痕跡発見！ ラウンド ${searchResult.traceRound} の痕跡`
                : " 痕跡発見！（ラウンド不明）"}
            </>
          ) : (
            <>
              <span style={{ fontSize: "1rem", fontWeight: 900 }}>✓</span> 痕跡なし
            </>
          )}
        </div>
      )}

      {/* ターン案内（ゲーム終了時は非表示） */}
      {!isFinished && (
        <div
          className={isMyPoliceTurn || isMyCriminalTurn ? "cc-glass-panel cc-pulse" : "cc-glass-panel"}
          style={{
            ...styles.turnGuide,
            borderColor: isMyPoliceTurn || isMyCriminalTurn
              ? isCriminal
                ? "rgba(220, 38, 38, 0.5)"
                : "rgba(37, 140, 244, 0.5)"
              : "rgba(100, 116, 139, 0.3)",
            color: isMyPoliceTurn || isMyCriminalTurn ? "#ffffff" : "#94a3b8",
            boxShadow: isMyPoliceTurn || isMyCriminalTurn
              ? isCriminal
                ? "0 0 20px rgba(220, 38, 38, 0.3)"
                : "0 0 20px rgba(37, 140, 244, 0.3)"
              : "none",
          }}
        >
          {isMyPoliceTurn ? (
            <span className="cc-text-tactical" style={{ fontSize: "0.75rem" }}>
              [H{state.currentHelicopterIndex + 1}] ヘリ #{state.currentHelicopterIndex + 1} —{" "}
              <strong>交差点をクリックで移動</strong>、
              <strong>ビルをクリックで捕索</strong>
            </span>
          ) : isMyCriminalTurn ? (
            <span className="cc-text-tactical" style={{ fontSize: "0.75rem" }}>
              [TARGET] 移動先のビルを選択してください
            </span>
          ) : (
            <span style={{ fontSize: "0.85rem" }}>
              {currentPlayer?.name ?? "他のプレイヤー"}の番です
            </span>
          )}
        </div>
      )}

      {/* ボード */}
      <div style={{ marginTop: "1rem" }}>
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
            <LegendItem color="#00e676" label="移動先" glow />
            <LegendItem color="#ff9800" label="捜索可能" glow />
          </>
        )}
        {isMyCriminalTurn && <LegendItem color="#00e676" label="移動先" glow />}
        <LegendItem color="#d97706" icon="!" label="痕跡あり" />
        <LegendItem color="#00e676" icon="✓" label="捕索済み" badge />
        {isCriminal && (
          <LegendItem color="#dc2626" icon="···" label="通過済み" />
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
          background: badge ? "rgba(16, 25, 34, 0.8)" : glow ? "rgba(100, 116, 139, 0.3)" : color,
          fontSize: icon === "···" ? "0.7rem" : badge ? "0.55rem" : "0.65rem",
          fontWeight: badge ? 900 : icon === "!" ? 900 : 700,
          color: badge ? color : "#fff",
          border: badge ? `1px solid ${color}` : "none",
          boxShadow: glow ? `0 0 0 2px ${color}, 0 0 6px 1px ${color}88` : undefined,
          fontFamily: icon === "!" || icon === "···" ? "'Orbitron', monospace" : "inherit",
          letterSpacing: icon === "···" ? "0.1em" : "normal",
        }}
      >
        {icon ?? ""}
      </span>
      <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>{label}</span>
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
  statusBar: {
    display: "flex",
    justifyContent: "center",
    gap: "0.75rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  roundBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  searchBanner: {
    padding: "0.5rem 1rem",
    borderRadius: 10,
    margin: "0 0 0.75rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3rem",
  },
  turnGuide: {
    padding: "0.6rem 1.2rem",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
    border: "1px solid",
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "1rem",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
};
