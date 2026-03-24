import type {
    BuildingPos,
    CitychaseMove,
    CitychasePlayerView,
    CitychaseState,
    GameResult,
    IntersectionPos,
    Player,
    RoomInfo,
} from "@bodobako/shared";
import {
    getAdjacentIntersections,
    getSurroundingBuildings,
    getValidCriminalMoves,
    isSamePos,
} from "@bodobako/shared";

import { clsx } from "clsx";
import { useCallback, useMemo } from "react";
import { GameResultCard } from "../../components/GameResultCard";
import { BoardGrid } from "./BoardGrid";

interface Props {
  state: CitychasePlayerView;
  playerId: string;
  room: RoomInfo;
  sendMove: (move: CitychaseMove) => void;
  gameResult: GameResult | null;
  startGame: () => void;
  leaveRoom: () => void;
  resultPlayers?: Player[] | null;
  rematchRequests?: string[];
  minPlayers?: number;
  onRematchRequest?: () => void;
}

export function GameBoard({
  state,
  playerId,
  room,
  sendMove,
  gameResult,
  startGame,
  leaveRoom,
  resultPlayers,
  rematchRequests,
  minPlayers,
  onRematchRequest,
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
  const moveTargets = useMemo<IntersectionPos[]>(
    () =>
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
        : [],
    [isMyPoliceTurn, currentHeli, state.helicopters, state.currentHelicopterIndex]
  );

  // 捜索可能なビル（警察）
  const searchTargets = useMemo<BuildingPos[]>(
    () => (isMyPoliceTurn && currentHeli ? getSurroundingBuildings(currentHeli) : []),
    [isMyPoliceTurn, currentHeli]
  );

  // 犯人の移動先候補
  const criminalMoveTargets = useMemo<BuildingPos[]>(
    () =>
      isMyCriminalTurn
        ? getValidCriminalMoves(state as CitychaseState)
        : [],
    [isMyCriminalTurn, state]
  );

  const currentPlayer = room.players.find(
    (p) => p.id === (isPolicePhase ? currentPoliceId : state.criminalId)
  );

  const searchResult = state.lastSearchResult;

  const handleIntersectionClick = useCallback((pos: IntersectionPos) => {
    if (isMyPoliceTurn) {
      sendMove({
        type: "move-helicopter",
        helicopterIndex: state.currentHelicopterIndex,
        pos,
      });
    }
  }, [isMyPoliceTurn, sendMove, state.currentHelicopterIndex]);

  const handleBuildingClick = useCallback((pos: BuildingPos) => {
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
  }, [isMyPoliceTurn, isMyCriminalTurn, sendMove, state.currentHelicopterIndex]);

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
    const criminal = (resultPlayers ?? room.players).find((p) => p.id === state.criminalId);
    return criminal?.name ?? "犯人";
  };

  return (
    <div className="text-center p-2 w-full max-w-[900px]">
      {/* ステータスバー */}
      <div className="flex justify-center gap-3 mb-3 flex-wrap">
        <div className="cc-status-badge flex items-center gap-2">
          <span className="cc-dot-primary w-1.5 h-1.5"></span>
          ROUND {state.round} / 11
        </div>
        <div
          className={clsx("cc-status-badge", isPolicePhase ? "cc-status-badge-primary" : "cc-status-badge-danger")}>
          {isPolicePhase ? "[P] POLICE PHASE" : "[T] FUGITIVE PHASE"}
        </div>
      </div>

      {/* 捜索結果バナー */}
      {searchResult && !searchResult.found && (
        <div
          className="cc-glass-panel px-4 py-2 rounded-[10px] mb-3 text-[0.85rem] font-semibold border flex items-center justify-center gap-[0.3rem]"
          style={{
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
          className={clsx("cc-glass-panel px-[1.2rem] py-[0.6rem] rounded-[10px] text-[0.85rem] font-semibold mb-3 border", { "cc-pulse": isMyPoliceTurn || isMyCriminalTurn })}
          style={{
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
      <div className="mt-4">
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
      <div className="flex justify-center gap-4 mt-4 flex-wrap">
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
          playerId={playerId}
          rematchRequests={rematchRequests}
          resultPlayers={resultPlayers ?? room.players}
          minPlayers={minPlayers}
          onRematchRequest={onRematchRequest}
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
    <div className="flex items-center gap-1">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm"
        style={{
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
      <span className="text-[0.7rem] text-slate-400 font-medium">{label}</span>
    </div>
  );
}

