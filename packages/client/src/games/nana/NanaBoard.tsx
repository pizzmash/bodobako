import { nanaDefinition } from "@bodobako/shared";
import type { NanaCardView, NanaMove, NanaStateView } from "@bodobako/shared";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameResultCard } from "../../components/GameResultCard";
import { useRoom } from "../../context/RoomContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { withAlpha } from "../../lib/color";
import {
    APP_HEADER_HEIGHT,
    C,
    FONT,
    NANA_HAND_FOOTER_HEIGHT_DESKTOP,
    NANA_HAND_FOOTER_HEIGHT_MOBILE,
    NANA_PLAYER_BAR_HEIGHT_MOBILE,
    NANA_TAB_HEIGHT_MOBILE,
    PLAYER_COLORS,
} from "./constants";
import { FieldCardView, findVisibleCardNumber } from "./FieldCardView";
import { GameLogPanel } from "./GameLogPanel";
import { OpponentArea } from "./OpponentArea";
import { RulesPanel } from "./RulesPanel";
import { StatusPanel } from "./StatusPanel";
import { TurnFlipsBar } from "./TurnFlipsBar";
import type { LogEntry } from "./types";

const getLogStorageKey = (roomCode: string) => `nana-logs-${roomCode}`;

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
  const [mobileTab, setMobileTab] = useState<"game" | "log">("game");
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (!room?.code) return [];
    try {
      const stored = localStorage.getItem(getLogStorageKey(room.code));
      if (stored) {
        const parsed = JSON.parse(stored) as LogEntry[];
        return parsed;
      }
    } catch {}
    return [];
  });
  const logIdRef = useRef(logs.length > 0 ? Math.max(...logs.map((l) => l.id)) : 0);
  const prevStateRef = useRef<NanaStateView | null>(null);
  const prevRoomCodeRef = useRef<string | null>(null);
  const playersRef = useRef(room?.players ?? []);
  playersRef.current = room?.players ?? [];

  const getName = useCallback(
    (pid: string) => playersRef.current.find((p) => p.id === pid)?.name ?? pid,
    [],
  );
  const getPlayerColor = useCallback((pid: string) => {
    const i = playersRef.current.findIndex((p) => p.id === pid);
    return PLAYER_COLORS[(i >= 0 ? i : 0) % PLAYER_COLORS.length];
  }, []);

  // ── ログ生成 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev) return;

    // NanaStateView は NanaState と同じフィールドを持つためキャストで利用
    const newEntries = nanaDefinition.getLogEntries!(prev as never, state as never);
    if (newEntries.length === 0) return;

    const logItems = newEntries.map((entry) => ({
      id: ++logIdRef.current,
      playerId: entry.playerId,
      player: getName(entry.playerId),
      msg: entry.message,
      tag: entry.tag,
      tagColor: entry.tagColor,
    }));

    setLogs((l) => [...logItems, ...l].slice(0, 50));
  }, [state, getName]);

  // ── ログ永続化 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.code) return;
    try {
      localStorage.setItem(getLogStorageKey(room.code), JSON.stringify(logs));
    } catch {}
  }, [logs, room?.code]);

  // ── ルーム退出時にログをクリア ──────────────────────────────────────
  useEffect(() => {
    if (room?.code) {
      prevRoomCodeRef.current = room.code;
    } else if (prevRoomCodeRef.current) {
      // room が null になった（leaveRoom が呼ばれた）場合はログをクリア
      try {
        localStorage.removeItem(getLogStorageKey(prevRoomCodeRef.current));
      } catch {}
      prevRoomCodeRef.current = null;
    }
  }, [room?.code]);

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
          zIndex: 120,
          background: "rgba(15,23,42,0.34)",
          backdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
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
  const currentPlayerName = getName(state.playerIds[state.currentPlayerIndex]);
  const playerList = state.playerIds;
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
            right: 0,
            bottom: `${NANA_HAND_FOOTER_HEIGHT_DESKTOP}px`,
            display: "flex",
            minHeight: 0,
            overflow: "hidden",
            background: C.bg,
            fontFamily: FONT,
          }}
        >
          {/* 左サイドバー */}
          <aside
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${C.border}`,
              background: "white",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              overflowY: "auto",
              minHeight: 0,
              height: "auto",
            }}
          >
            {/* ロゴ */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: "fit-content",
                  height: "fit-content",
                  padding: "4px 8px",
                  background: C.primary,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "white",
                  fontFamily: FONT,
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}
              >
                ナナ
              </div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: C.primary,
                  margin: 0,
                  fontFamily: FONT,
                }}
              >
                <span
                  style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}
                >
                  Nana
                </span>
              </h1>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: C.muted,
                  marginBottom: 8,
                }}
              >
                プレイヤー
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {playerList.map((pid) => (
                  <OpponentArea
                    key={pid}
                    pid={pid}
                    name={getName(pid)}
                    state={state}
                    isMyTurn={isMyTurn}
                    onFlip={(pos) => handleFlipHand(pid, pos)}
                    isCurrentPlayer={state.playerIds[state.currentPlayerIndex] === pid}
                    playerColor={getPlayerColor(pid)}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <StatusPanel
                state={state}
                playerId={playerId}
                currentPlayerName={currentPlayerName}
              />
              <RulesPanel />
            </div>
          </aside>

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

          {/* 右サイドバー */}
          <aside
            style={{
              width: 200,
              flexShrink: 0,
              borderLeft: `1px solid ${C.border}`,
              background: "white",
              padding: 16,
              overflowY: "auto",
              minHeight: 0,
              height: "auto",
            }}
          >
            <GameLogPanel logs={logs} getPlayerColor={getPlayerColor} />
          </aside>
        </main>

        {/* 手札フッター */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
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
        paddingBottom:
          NANA_HAND_FOOTER_HEIGHT_MOBILE + NANA_PLAYER_BAR_HEIGHT_MOBILE + NANA_TAB_HEIGHT_MOBILE,
        background: C.bg,
        fontFamily: FONT,
      }}
    >
      {/* タブコンテンツ */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {mobileTab === "game" && (
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
        )}
        {mobileTab === "log" && (
          <div style={{ height: "100%", padding: 16 }}>
            <GameLogPanel logs={logs} getPlayerColor={getPlayerColor} />
          </div>
        )}
      </div>

      {/* 手札フッター */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: NANA_PLAYER_BAR_HEIGHT_MOBILE + NANA_TAB_HEIGHT_MOBILE,
          zIndex: 22,
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

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: NANA_TAB_HEIGHT_MOBILE,
          zIndex: 21,
          height: NANA_PLAYER_BAR_HEIGHT_MOBILE,
          background: "white",
          borderTop: `1px solid ${C.border}`,
          padding: "8px 6px",
          overflowX: "auto",
          overflowY: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          {playerList.map((pid) => (
            <OpponentArea
              key={pid}
              pid={pid}
              name={getName(pid)}
              state={state}
              isMyTurn={isMyTurn}
              onFlip={(pos) => handleFlipHand(pid, pos)}
              isCurrentPlayer={state.playerIds[state.currentPlayerIndex] === pid}
              playerColor={getPlayerColor(pid)}
            />
          ))}
        </div>
      </div>

      {/* 下部ナビ */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 23,
          height: NANA_TAB_HEIGHT_MOBILE,
          background: "white",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          flexShrink: 0,
        }}
      >
        {(["game", "log"] as const).map((tab) => {
          const labels = { game: "ゲーム", log: "ログ" };
          const icons = { game: "🃏", log: "📋" };
          const active = mobileTab === tab;
          return (
            <button
              key={tab}
              className="nana-bottom-nav-btn"
              style={{
                flex: 1,
                border: "none",
                background: active ? C.primaryLight : "transparent",
                color: active ? C.primary : C.muted,
                fontWeight: active ? 700 : 500,
                fontFamily: FONT,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderTop: active ? `2px solid ${C.primary}` : "2px solid transparent",
              }}
              onClick={() => setMobileTab(tab)}
            >
              <span style={{ fontSize: 16 }}>{icons[tab]}</span>
              {labels[tab]}
            </button>
          );
        })}
      </div>
      {resultOverlay}
    </div>
  );
}
