/**
 * ブロックストライゴン — ルートコンポーネント
 */

import type { BlokusTrigonMove, BlokusTrigonState, GameResult, RoomInfo } from "@bodobako/shared";
import { trigonBoardToGrid, trigonComputePlayerScore } from "@bodobako/shared";
import { useCallback, useMemo } from "react";
import { GameRankingResult } from "../../components/GameRankingResult";
import { useRoom } from "../../context/RoomContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useBoardScale } from "../blokus/hooks/useBoardScale";
import { BlokusTrigonMainBoard } from "./BlokusTrigonMainBoard";
import { BlokusTrigonPieceControls } from "./BlokusTrigonPieceControls";
import { BlokusTrigonPiecePalette } from "./BlokusTrigonPiecePalette";
import { BlokusLogo } from "../blokus/BlokusLogo";
import { BG_GRADIENT, BOARD_PX, TRIGON_COLORS } from "./constants";
import { useBlokusTrigonDerivedState } from "./hooks/useBlokusTrigonDerivedState";
import { useBlokusTrigonInteraction } from "./hooks/useBlokusTrigonInteraction";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface ContentProps {
  state: BlokusTrigonState;
  playerId: string;
  sendMove: (move: unknown) => void;
  gameResult: GameResult | null;
  room: RoomInfo;
  startGame: () => void;
  leaveRoom: () => void;
}

// ---------------------------------------------------------------------------
// ルートコンポーネント
// ---------------------------------------------------------------------------

export function BlokusTrigonBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  if (gameState !== null && gameState.gameId !== "blokus-trigon") return null;
  const state = gameState?.state ?? null;

  if (!state || !playerId || !room) return null;

  return (
    <BlokusTrigonBoardContent
      state={state}
      playerId={playerId}
      sendMove={sendMove}
      gameResult={gameResult}
      room={room}
      startGame={startGame}
      leaveRoom={leaveRoom}
    />
  );
}

// ---------------------------------------------------------------------------
// コンテンツ
// ---------------------------------------------------------------------------

function BlokusTrigonBoardContent({
  state,
  playerId,
  sendMove,
  gameResult,
  room,
  startGame,
  leaveRoom,
}: ContentProps) {
  const isWide = useBreakpoint(760);
  const [boardOuterRef, boardScale] = useBoardScale(BOARD_PX);

  const sendTypedMove = useCallback(
    (move: BlokusTrigonMove) => sendMove(move),
    [sendMove],
  );

  const interaction = useBlokusTrigonInteraction({
    state,
    playerId,
    sendMove: sendTypedMove,
  });

  const { myColorIndices, turnMessage, turnColor } =
    useBlokusTrigonDerivedState({
      state,
      playerId,
      room,
      isMyTurn: interaction.isMyTurn,
    });

  const grid = useMemo(() => trigonBoardToGrid(state), [state]);

  const lastMoveCells = useMemo(
    () =>
      new Set(
        (state.lastMove?.cells ?? []).map(([r, c]) => `${r},${c}`),
      ),
    [state.lastMove],
  );

  const currentColorIndex = state.currentColorIndex;

  return (
    <div
      className="flex flex-col items-center min-h-screen py-3 px-2 gap-[0.65rem]"
      style={{ background: BG_GRADIENT }}
    >
      {/* ロゴ */}
      <BlokusLogo size="lg" subtitle="Trigon" />

      {/* 手番メッセージ */}
      {turnMessage && (
        <div
          className={`text-[0.95rem] font-bold px-4 py-[0.35rem] rounded-full tracking-[0.03em] flex items-center gap-[0.4rem]${interaction.isMyTurn ? " blk-turn-banner-glow" : ""}`}
          style={{
            color: turnColor,
            background: `${turnColor}14`,
            border: `1px solid ${turnColor}33`,
          }}
        >
          {interaction.isMyTurn && (
            <span className="text-[0.7rem] opacity-80">▶</span>
          )}
          {turnMessage}
        </div>
      )}

      {/* メインゲームエリア */}
      <div
        className={`flex gap-[0.9rem] w-full max-w-[900px] justify-center${isWide ? " flex-row items-start" : " flex-col items-center"}`}
      >
        {/* ボード */}
        <div
          ref={boardOuterRef}
          className="overflow-hidden shrink-0"
          style={{
            width: isWide ? BOARD_PX : "100%",
          }}
        >
          <div
            style={
              isWide
                ? undefined
                : {
                    transform: `scale(${boardScale})`,
                    transformOrigin: "top left",
                    width: BOARD_PX,
                  }
            }
          >
            <BlokusTrigonMainBoard
              grid={grid}
              selectedPieceId={interaction.selectedPieceId}
              validCenterSet={interaction.validCenterSet}
              ghostCells={interaction.ghostCells}
              isGhostValid={interaction.isGhostValid}
              isMyTurn={interaction.isMyTurn}
              activeColorIndex={currentColorIndex}
              lastMoveCells={lastMoveCells}
              numColors={state.numColors}
              borderRestriction={state.borderRestriction}
              onCellClick={interaction.handleBoardClick}
              onCellHover={interaction.handleCellHover}
              onBoardLeave={interaction.handleBoardLeave}
            />
          </div>
        </div>

        {/* 右パネル */}
        <div
          className={`flex flex-col gap-[0.7rem] shrink-0${isWide ? " w-[290px]" : " w-full max-w-[560px]"}`}
        >
          <BlokusTrigonPieceControls
            selectedPieceId={interaction.selectedPieceId}
            variantIndex={interaction.variantIndex}
            colorIndex={currentColorIndex}
            onRotate={interaction.handleRotate}
            onFlip={interaction.handleFlip}
          />
          <BlokusTrigonPiecePalette
            state={state}
            myColorIndices={myColorIndices}
            activeColorIndex={currentColorIndex}
            selectedPieceId={interaction.selectedPieceId}
            isMyTurn={interaction.isMyTurn}
            onSelectPiece={interaction.handleSelectPiece}
          />
        </div>
      </div>

      {/* ゲーム終了リザルト */}
      {gameResult && gameResult.ranking && (
        <GameRankingResult
          ranking={gameResult.ranking}
          room={room}
          playerId={playerId}
          accentColor={TRIGON_COLORS[0].fill}
          renderPlayerDetail={(pid) => {
            const pIdx = state.playerIds.indexOf(pid);
            if (pIdx === -1) return null;
            const score = trigonComputePlayerScore(state, pIdx);
            return (
              <span className="text-xs text-slate-400">
                -{score}pt
              </span>
            );
          }}
          onRestart={startGame}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}
