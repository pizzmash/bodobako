/**
 * ブロックス — ルートコンポーネント
 *
 * useRoom() からデータを取得し、各サブコンポーネントを組み立てる。
 * フックを条件付きで呼ばないよう、guard は BlokusBoardContent への
 * 委譲で解決している。
 */

import type { BlokusMove, BlokusState, GameResult, RoomInfo } from "@bodobako/shared";
import { boardToGrid, computePlayerRemainingCells } from "@bodobako/shared";
import { useCallback, useMemo } from "react";
import { GameRankingResult } from "../../components/GameRankingResult";
import { useRoom } from "../../context/RoomContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { BlokusLogo } from "./BlokusLogo";
import { BlokusMainBoard } from "./BlokusMainBoard";
import { BlokusPieceControls } from "./BlokusPieceControls";
import { BlokusPiecePalette } from "./BlokusPiecePalette";
import { BlokusPlayerInfo } from "./BlokusPlayerInfo";
import { BG_GRADIENT, BLOKUS_COLORS, BOARD_PX } from "./constants";
import { useBlokusDerivedState } from "./hooks/useBlokusDerivedState";
import { useBlokusInteraction } from "./hooks/useBlokusInteraction";
import { useBoardScale } from "./hooks/useBoardScale";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface BlokusBoardContentProps {
  state: BlokusState;
  playerId: string;
  sendMove: (move: unknown) => void;
  gameResult: GameResult | null;
  room: RoomInfo;
  startGame: () => void;
  leaveRoom: () => void;
}

// ---------------------------------------------------------------------------
// ルートコンポーネント（guard + 委譲）
// ---------------------------------------------------------------------------

export function BlokusBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } = useRoom();
  if (gameState !== null && gameState.gameId !== "blokus") return null;
  const state = gameState?.state ?? null;

  if (!state || !playerId || !room) return null;

  return (
    <BlokusBoardContent
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
// コンテンツコンポーネント（全フックはここで呼ぶ）
// ---------------------------------------------------------------------------

function BlokusBoardContent({
  state,
  playerId,
  sendMove,
  gameResult,
  room,
  startGame,
  leaveRoom,
}: BlokusBoardContentProps) {
  const isWide = useBreakpoint(760);
  const [boardOuterRef, boardScale] = useBoardScale(BOARD_PX);

  const sendTypedMove = useCallback((move: BlokusMove) => sendMove(move), [sendMove]);

  const interaction = useBlokusInteraction({
    state,
    playerId,
    sendMove: sendTypedMove,
  });

  const { myColorIndices, turnMessage, turnColor } = useBlokusDerivedState({
    state,
    playerId,
    room,
    isMyTurn: interaction.isMyTurn,
  });

  const grid = useMemo(() => boardToGrid(state), [state]);

  const lastMoveCells = useMemo(
    () => new Set((state.lastMove?.cells ?? []).map(([r, c]) => `${r},${c}`)),
    [state.lastMove],
  );

  const currentColorIndex = state.currentColorIndex;
  const scaledBoardH = BOARD_PX * boardScale;

  return (
    <div
      className="flex flex-col items-center min-h-screen py-3 px-2 gap-[0.65rem]"
      style={{ background: BG_GRADIENT }}
    >
      {/* ロゴ */}
      <BlokusLogo size="lg" />

      {/* プレイヤー情報 */}
      <BlokusPlayerInfo state={state} playerId={playerId} room={room} />

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
          {interaction.isMyTurn && <span className="text-[0.7rem] opacity-80">▶</span>}
          {turnMessage}
        </div>
      )}

      {/* メインゲームエリア */}
      <div
        className="flex gap-[0.9rem] w-full max-w-[900px] justify-center"
        style={{
          flexDirection: isWide ? "row" : "column",
          alignItems: isWide ? "flex-start" : "center",
        }}
      >
        {/* ボード列（モバイル: スケール変換） */}
        <div
          ref={boardOuterRef}
          className="blk-board-outer overflow-hidden shrink-0"
          style={{
            width: isWide ? BOARD_PX : "100%",
            height: isWide ? BOARD_PX : scaledBoardH,
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
            <BlokusMainBoard
              grid={grid}
              selectedPieceId={interaction.selectedPieceId}
              validCenterSet={interaction.validCenterSet}
              ghostCells={interaction.ghostCells}
              isGhostValid={interaction.isGhostValid}
              isMyTurn={interaction.isMyTurn}
              activeColorIndex={currentColorIndex}
              lastMoveCells={lastMoveCells}
              onCellClick={interaction.handleBoardClick}
              onCellHover={(r, c) => interaction.setHoverCell({ row: r, col: c })}
              onBoardLeave={interaction.handleBoardLeave}
            />
          </div>
        </div>

        {/* 右パネル（コントロール + パレット） */}
        <div
          className="flex flex-col gap-[0.7rem] shrink-0"
          style={{
            width: isWide ? 290 : "100%",
            maxWidth: isWide ? 290 : 560,
          }}
        >
          <BlokusPieceControls
            selectedPieceId={interaction.selectedPieceId}
            variantIndex={interaction.variantIndex}
            colorIndex={currentColorIndex}
            onRotate={interaction.handleRotate}
            onFlip={interaction.handleFlip}
          />
          <BlokusPiecePalette
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
          accentColor={BLOKUS_COLORS[0].fill}
          renderPlayerDetail={(id) => {
            const playerIndex = state.playerIds.indexOf(id);
            const remaining = computePlayerRemainingCells(state, playerIndex);
            return `残り ${remaining}マス`;
          }}
          onRestart={startGame}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}
