import type { NanaCardView, NanaMove, NanaStateView } from "@bodobako/shared";
import { memo, useCallback, useMemo, useRef } from "react";
import { GameResultCard } from "../../components/GameResultCard";
import { useRoom } from "../../context/RoomContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { withAlpha } from "../../lib/color";
import { MOBILE_TAB_BAR_HEIGHT } from "../../lib/constants";
import { Z } from "../../styles/tokens";
import {
    APP_HEADER_HEIGHT,
    C,
    FONT,
    NANA_HAND_FOOTER_HEIGHT_DESKTOP,
    NANA_HAND_FOOTER_HEIGHT_MOBILE,
    PLAYER_COLORS,
} from "./constants";
import { FieldCardView, findVisibleCardNumber } from "./FieldCardView";
import { TurnFlipsBar } from "./TurnFlipsBar";

// ── サブコンポーネント ────────────────────────────────────────────────────────────────────

const TurnFlipsSection = memo(function TurnFlipsSection({
  flips,
  state,
  resolvedNumbers,
  getPlayerColor,
}: {
  flips: NanaStateView["turnFlips"];
  state: NanaStateView;
  resolvedNumbers: Record<number, number | null>;
  getPlayerColor: (pid: string) => string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        minHeight: 102,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.muted,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: flips.length > 0 ? 1 : 0.65,
        }}
      >
        今ターンのカード
      </div>
      <TurnFlipsBar
        flips={flips}
        state={state}
        resolvedNumbers={resolvedNumbers}
        getPlayerColor={getPlayerColor}
      />
    </div>
  );
});

const GuideBanner = memo(function GuideBanner({
  isMyTurn,
  pendingResult,
  turnFlipsCount,
}: {
  isMyTurn: boolean;
  pendingResult: "success" | "failure" | null;
  turnFlipsCount: number;
}) {
  if (!isMyTurn || pendingResult !== null || turnFlipsCount >= 3) return null;
  const msgs = [
    "場か誰かの手札からカードを1枚選んでください",
    "もう1枚めくってください！",
    "あと1枚！3枚揃えてセット！",
  ];
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div
        className="nana-guide-banner"
        style={{
          background: C.primary,
          color: "white",
          fontWeight: 700,
          padding: "10px 24px",
          borderRadius: 99,
          boxShadow: "0 4px 20px rgba(244,157,37,0.4)",
          fontSize: 13,
          fontFamily: FONT,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>👆</span>
        {msgs[turnFlipsCount]}
      </div>
    </div>
  );
});

const ConfirmBanner = memo(function ConfirmBanner({
  isMyTurn,
  pendingResult,
  onConfirm,
}: {
  isMyTurn: boolean;
  pendingResult: "success" | "failure" | null;
  onConfirm: () => void;
}) {
  if (!isMyTurn || pendingResult === null) return null;
  const isSuccess = pendingResult === "success";
  const label = isSuccess ? "確認してセット獲得" : "確認してターン終了";
  const bg = isSuccess ? "#16a34a" : "#2563eb";
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={onConfirm}
        style={{
          border: "none",
          background: bg,
          color: "white",
          fontWeight: 800,
          padding: "10px 20px",
          borderRadius: 999,
          boxShadow: `0 6px 16px ${withAlpha(bg, 0.35)}`,
          fontSize: 13,
          fontFamily: FONT,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
});

const FieldGrid = memo(function FieldGrid({
  cardW,
  cardH,
  fieldCards,
  isMyTurn,
  pendingResult,
  displayTurnFlipIds,
  displayTurnFlipNumbers,
  onFlipField,
}: {
  cardW: number;
  cardH: number;
  fieldCards: NanaStateView["fieldCards"];
  isMyTurn: boolean;
  pendingResult: "success" | "failure" | null;
  displayTurnFlipIds: Set<number>;
  displayTurnFlipNumbers: Record<number, number | null>;
  onFlipField: (index: number) => void;
}) {
  const cols = fieldCards.length <= 6 ? 3 : fieldCards.length <= 8 ? 4 : 5;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cardW}px)`,
        gap: 10,
        justifyContent: "center",
      }}
    >
      {fieldCards.map((card, i) => {
        const clickable =
          isMyTurn && pendingResult === null && card !== null && !displayTurnFlipIds.has(card.id);
        const displayCard =
          card && displayTurnFlipIds.has(card.id)
            ? { ...card, number: displayTurnFlipNumbers[card.id] ?? card.number }
            : card;
        return (
          <FieldCardView
            key={card ? card.id : `empty-${i}`}
            card={displayCard}
            clickable={clickable}
            w={cardW}
            h={cardH}
            onClick={() => onFlipField(i)}
          />
        );
      })}
    </div>
  );
});

const HandFooter = memo(function HandFooter({
  cardW,
  cardH,
  myHand,
  displayTurnFlipIds,
  displayTurnFlipNumbers,
  isMyTurn,
  pendingResult,
  myMinId,
  myMaxId,
  playerId,
  myColor,
  onFlipHand,
}: {
  cardW: number;
  cardH: number;
  myHand: NanaCardView[];
  displayTurnFlipIds: Set<number>;
  displayTurnFlipNumbers: Record<number, number | null>;
  isMyTurn: boolean;
  pendingResult: "success" | "failure" | null;
  myMinId: number | undefined;
  myMaxId: number | undefined;
  playerId: string;
  myColor: string;
  onFlipHand: (targetPlayerId: string, position: "min" | "max") => void;
}) {
  return (
    <div
      style={{
        height: cardH + 52,
        background: "white",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        justifyContent: "flex-start",
        padding: "4px 0 0",
      }}
    >
      <div
        style={{
          background: "white",
          border: `1px solid ${C.border}`,
          padding: "1px 10px",
          borderRadius: 99,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: FONT,
          color: C.text,
          whiteSpace: "nowrap",
          marginBottom: 4,
        }}
      >
        あなたの手札
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          overflowY: "visible",
          padding: "8px 8px 14px",
          maxWidth: "100%",
          minHeight: cardH + 14,
        }}
      >
        {myHand.map((card) => {
          const isFlipped = displayTurnFlipIds.has(card.id);
          const isMin = myMinId === card.id && !isFlipped;
          const isMax = myMaxId === card.id && !isFlipped && myMinId !== myMaxId;
          const canClick = isMyTurn && pendingResult === null && (isMin || isMax);
          return (
            <div
              key={card.id}
              className={`nana-hand-card${canClick ? " clickable" : ""}`}
              style={{ position: "relative", flexShrink: 0 }}
              onClick={
                canClick
                  ? () => onFlipHand(playerId, isMin ? "min" : "max")
                  : undefined
              }
            >
              <div
                style={{
                  width: cardW,
                  height: cardH,
                  background: isFlipped ? "#e2e8f0" : "#f8f7f5",
                  borderRadius: 8,
                  border: `2px solid ${isMin || isMax ? myColor : C.border}`,
                  boxShadow:
                    isMin || isMax
                      ? `0 0 0 4px ${withAlpha(myColor, 0.2)}`
                      : "0 2px 6px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canClick ? "pointer" : "default",
                  opacity: isFlipped ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: Math.round(cardH * 0.36),
                    fontWeight: 900,
                    color: isMin || isMax ? myColor : C.text,
                  }}
                >
                  {card.number}
                </span>
              </div>
              {isMin && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: myColor,
                    color: "white",
                    fontSize: 8,
                    fontWeight: 900,
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                  }}
                >
                  MIN
                </div>
              )}
              {isMax && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: myColor,
                    color: "white",
                    fontSize: 8,
                    fontWeight: 900,
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                  }}
                >
                  MAX
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── メインコンポーネント ──────────────────────────────────────────────

export function NanaBoard() {
  const { gameState, playerId, sendMove, room, gameResult, startGame, leaveRoom } = useRoom();
  // フックはすべて条件リターンより前に呼ぶ（React Hooks のルール）
  const state = gameState?.gameId === "nana" ? gameState.state : null;
  const isMobile = useIsMobile();
  const prevStateRef = useRef<NanaStateView | null>(null);
  const playersRef = useRef(room?.players ?? []);
  playersRef.current = room?.players ?? [];

  const getPlayerColor = useCallback((pid: string) => {
    const i = playersRef.current.findIndex((p) => p.id === pid);
    return PLAYER_COLORS[(i >= 0 ? i : 0) % PLAYER_COLORS.length];
  }, []);

  // prevStateRef の更新（ゲームロジックで参照される場合に備える）
  if (state && state !== prevStateRef.current) {
    prevStateRef.current = state;
  }

  // ── 早期リターン ──────────────────────────────────────────────────
  if (gameState !== null && gameState.gameId !== "nana") return null;
  if (!state || !playerId || !room) return null;

  // ── ゲーム結果オーバーレイ ───────────────────────────────────────
  let resultOverlay = null;
  if (gameResult) {
    const winnerId = gameResult.ranking?.[0] ?? null;
    const myResult = winnerId === playerId ? "win" : "lose";
    const winnerName = room.players.find((p) => p.id === winnerId)?.name;
    resultOverlay = (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: Z.overlay,
          background: "rgba(15,23,42,0.34)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          paddingRight: "calc(16px + var(--sidebar-right-offset, 0px))",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%" }}>
          <GameResultCard
            result={myResult}
            winnerName={winnerName}
            isHost={room.hostId === playerId}
            onRematch={startGame}
            onLeave={leaveRoom}
          />
        </div>
      </div>
    );
  }

  // ── 計算 ──────────────────────────────────────────────────────────
  const pendingResult = state.pendingResult ?? null;
  const isMyTurn = state.playerIds[state.currentPlayerIndex] === playerId;
  const displayFlipEntries = useMemo(
    () => state.turnFlips.map((flip) => ({
      flip,
      number: findVisibleCardNumber(state, flip.cardId),
    })),
    [state]
  );
  const displayTurnFlips = useMemo(
    () => displayFlipEntries.map((e) => e.flip),
    [displayFlipEntries]
  );
  const displayTurnFlipNumbers = useMemo(
    () => Object.fromEntries(displayFlipEntries.map((e) => [e.flip.cardId, e.number])),
    [displayFlipEntries]
  );
  const displayTurnFlipIds = useMemo(
    () => new Set(displayTurnFlips.map((f) => f.cardId)),
    [displayTurnFlips]
  );
  const turnFlipIds = useMemo(
    () => new Set(state.turnFlips.map((f) => f.cardId)),
    [state.turnFlips]
  );
  const myHand = state.hands[playerId] ?? [];
  const myActiveCards = useMemo(
    () => myHand.filter((c) => !turnFlipIds.has(c.id)),
    [myHand, turnFlipIds]
  );
  const myMinId = myActiveCards[0]?.id;
  const myMaxId = myActiveCards[myActiveCards.length - 1]?.id;
  const myColor = useMemo(() => getPlayerColor(playerId), [getPlayerColor, playerId]);

  // ── ムーブ送信 ────────────────────────────────────────────────────
  const handleFlipField = useCallback((index: number) => {
    sendMove({ type: "flip-field", fieldIndex: index } as NanaMove);
  }, [sendMove]);
  const handleFlipHand = useCallback((targetPlayerId: string, position: "min" | "max") => {
    sendMove({ type: "flip-hand", targetPlayerId, position } as NanaMove);
  }, [sendMove]);
  const handleConfirm = useCallback(() => {
    sendMove({ type: "confirm" } as NanaMove);
  }, [sendMove]);

  const hasBottomAction = isMyTurn && (pendingResult !== null || state.turnFlips.length < 3);

  // ── デスクトップレイアウト ──────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        <main
          style={{
            position: "fixed",
            top: `${APP_HEADER_HEIGHT}px`,
            left: 0,
            right: "var(--sidebar-right-offset, 0px)",
            bottom: `${NANA_HAND_FOOTER_HEIGHT_DESKTOP}px`,
            display: "flex",
            minHeight: 0,
            overflow: "hidden",
            background: C.bg,
            fontFamily: FONT,
          }}
        >
          {/* センター */}
          <section
            style={{
              flex: 1,
              background: C.bg,
              padding: 20,
              display: "grid",
              gridTemplateRows: "102px minmax(0, 1fr) 84px",
              rowGap: 16,
              overflow: "hidden",
              minHeight: 0,
              height: "auto",
            }}
          >
            <TurnFlipsSection
              flips={displayTurnFlips}
              state={state}
              resolvedNumbers={displayTurnFlipNumbers}
              getPlayerColor={getPlayerColor}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FieldGrid
                cardW={76}
                cardH={101}
                fieldCards={state.fieldCards}
                isMyTurn={isMyTurn}
                pendingResult={pendingResult}
                displayTurnFlipIds={displayTurnFlipIds}
                displayTurnFlipNumbers={displayTurnFlipNumbers}
                onFlipField={handleFlipField}
              />
            </div>
            <div
              style={{
                height: 84,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ConfirmBanner isMyTurn={isMyTurn} pendingResult={pendingResult} onConfirm={handleConfirm} />
              <GuideBanner isMyTurn={isMyTurn} pendingResult={pendingResult} turnFlipsCount={state.turnFlips.length} />
            </div>
          </section>
        </main>

        {/* 手札フッター */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: "var(--sidebar-right-offset, 0px)",
            bottom: 0,
            zIndex: 10,
            background: "white",
          }}
        >
          <HandFooter
          cardW={68}
          cardH={91}
          myHand={myHand}
          displayTurnFlipIds={displayTurnFlipIds}
          displayTurnFlipNumbers={displayTurnFlipNumbers}
          isMyTurn={isMyTurn}
          pendingResult={pendingResult}
          myMinId={myMinId}
          myMaxId={myMaxId}
          playerId={playerId}
          myColor={myColor}
          onFlipHand={handleFlipHand}
        />
        </div>
        {resultOverlay}
      </>
    );
  }

  // ── モバイルレイアウト ─────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        paddingBottom: NANA_HAND_FOOTER_HEIGHT_MOBILE + MOBILE_TAB_BAR_HEIGHT,
        background: C.bg,
        fontFamily: FONT,
      }}
    >
      {/* ゲームコンテンツ */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            padding: "8px",
            display: "grid",
            gridTemplateRows: hasBottomAction
              ? "102px minmax(0, 1fr) 72px"
              : "102px minmax(0, 1fr)",
            rowGap: 10,
          }}
        >
          <TurnFlipsSection
            flips={displayTurnFlips}
            state={state}
            resolvedNumbers={displayTurnFlipNumbers}
            getPlayerColor={getPlayerColor}
          />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FieldGrid
              cardW={55}
              cardH={73}
              fieldCards={state.fieldCards}
              isMyTurn={isMyTurn}
              pendingResult={pendingResult}
              displayTurnFlipIds={displayTurnFlipIds}
              displayTurnFlipNumbers={displayTurnFlipNumbers}
              onFlipField={handleFlipField}
            />
          </div>
          {hasBottomAction && (
            <div
              style={{
                height: 72,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <ConfirmBanner isMyTurn={isMyTurn} pendingResult={pendingResult} onConfirm={handleConfirm} />
              <GuideBanner isMyTurn={isMyTurn} pendingResult={pendingResult} turnFlipsCount={state.turnFlips.length} />
            </div>
          )}
        </div>
      </div>

      {/* 手札フッター */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: MOBILE_TAB_BAR_HEIGHT,
          zIndex: Z.nanaHandFooter,
          background: "white",
        }}
      >
        <HandFooter
          cardW={52}
          cardH={69}
          myHand={myHand}
          displayTurnFlipIds={displayTurnFlipIds}
          displayTurnFlipNumbers={displayTurnFlipNumbers}
          isMyTurn={isMyTurn}
          pendingResult={pendingResult}
          myMinId={myMinId}
          myMaxId={myMaxId}
          playerId={playerId}
          myColor={myColor}
          onFlipHand={handleFlipHand}
        />
      </div>

      {resultOverlay}
    </div>
  );
}
