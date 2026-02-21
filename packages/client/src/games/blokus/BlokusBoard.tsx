/**
 * ブロックス — ルートコンポーネント
 *
 * useRoom() からデータを取得し、各サブコンポーネントを組み立てる。
 * フックを条件付きで呼ばないよう、guard は BlokusBoardContent への
 * 委譲で解決している。
 */

import type { BlokusMove, BlokusState } from "@bodobako/shared";
import {
  boardToGrid,
  computePlayerRemainingCells,
  getCurrentPlayerId,
} from "@bodobako/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameRankingResult } from "../../components/GameRankingResult";
import { useRoom } from "../../context/RoomContext";
import type { GameResult, RoomInfo } from "@bodobako/shared";
import { BlokusMainBoard } from "./BlokusMainBoard";
import { BlokusPieceControls } from "./BlokusPieceControls";
import { BlokusPiecePalette } from "./BlokusPiecePalette";
import { BlokusPlayerInfo } from "./BlokusPlayerInfo";
import { BLOKUS_COLORS, BOARD_PX, FONT } from "./constants";
import { useBlokusInteraction } from "./hooks/useBlokusInteraction";
import "./blokus.css";

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
// レスポンシブフック
// ---------------------------------------------------------------------------

function useIsWide(breakpoint = 760): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth > breakpoint,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    setIsWide(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isWide;
}

// ---------------------------------------------------------------------------
// ルートコンポーネント（guard + 委譲）
// ---------------------------------------------------------------------------

export function BlokusBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } = useRoom();
  const state = gameState as BlokusState | null;

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
  const isWide = useIsWide(760);

  // ボードの外側コンテナ ref でスケール計算
  const boardOuterRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  useEffect(() => {
    const el = boardOuterRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth;
      setBoardScale(Math.min(1, available / BOARD_PX));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sendTypedMove = useCallback((move: BlokusMove) => sendMove(move), [sendMove]);

  const interaction = useBlokusInteraction({
    state,
    playerId,
    sendMove: sendTypedMove,
  });

  const grid = useMemo(() => boardToGrid(state), [state]);

  const currentColorIndex = state.currentColorIndex;
  const isMyTurn = interaction.isMyTurn;

  // 手番メッセージ
  const turnPlayerId = getCurrentPlayerId(state);
  const turnPlayerName = room.players.find((p) => p.id === turnPlayerId)?.name ?? "相手";
  const turnMessage = state.finished
    ? null
    : isMyTurn
      ? `あなたの番です（${BLOKUS_COLORS[currentColorIndex].label}）`
      : `${turnPlayerName} の番です`;

  // ボードの実効高さ（スケール後）
  const scaledBoardH = BOARD_PX * boardScale;

  return (
    <div style={{ ...styles.container, fontFamily: FONT }}>
      {/* プレイヤー情報 */}
      <BlokusPlayerInfo state={state} playerId={playerId} room={room} />

      {/* 手番メッセージ */}
      {turnMessage && (
        <div
          style={{
            ...styles.turnBanner,
            color: BLOKUS_COLORS[currentColorIndex].fill,
          }}
        >
          {turnMessage}
        </div>
      )}

      {/* メインゲームエリア */}
      <div
        style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          gap: "0.9rem",
          alignItems: isWide ? "flex-start" : "center",
          width: "100%",
          maxWidth: 900,
          justifyContent: "center",
        }}
      >
        {/* ボード列（モバイル: スケール変換） */}
        <div
          ref={boardOuterRef}
          className="blk-board-outer"
          style={{
            // スケール後の実効サイズでスペースを確保
            width: isWide ? BOARD_PX : "100%",
            height: isWide ? BOARD_PX : scaledBoardH,
            flexShrink: 0,
            overflow: "hidden",
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
              isMyTurn={isMyTurn}
              onCellClick={interaction.handleBoardClick}
              onCellHover={(r, c) => interaction.setHoverCell({ row: r, col: c })}
              onBoardLeave={interaction.handleBoardLeave}
            />
          </div>
        </div>

        {/* 右パネル（コントロール + パレット） */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
            width: isWide ? 290 : "100%",
            maxWidth: isWide ? 290 : 560,
            flexShrink: 0,
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
            colorIndex={currentColorIndex}
            selectedPieceId={interaction.selectedPieceId}
            isMyTurn={isMyTurn}
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

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "0.75rem 0.5rem",
    gap: "0.65rem",
  },
  turnBanner: {
    fontSize: "1.05rem",
    fontWeight: 700,
  },
};
