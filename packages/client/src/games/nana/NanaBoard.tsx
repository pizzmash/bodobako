import type { NanaMove, NanaStateView } from "@bodobako/shared";
import { useEffect, useRef, useState } from "react";
import { GameResultCard } from "../../components/GameResultCard";
import { useRoom } from "../../context/RoomContext";
import "./nana.css";

// ── 定数 ────────────────────────────────────────────────────────────

const C = {
  primary: "#f49d25",
  primaryLight: "rgba(244,157,37,0.10)",
  primaryBorder: "rgba(244,157,37,0.30)",
  bg: "#f0ede8",
  card: "#ffffff",
  text: "#1e293b",
  muted: "#94a3b8",
  border: "#e2e8f0",
} as const;

const CARD_BACK_STYLE: React.CSSProperties = {
  backgroundColor: C.primary,
  backgroundImage:
    "radial-gradient(#ffffff 10%, transparent 10%), radial-gradient(#ffffff 10%, transparent 10%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 10px 10px",
  border: "2px solid rgba(255,255,255,0.5)",
};

const FONT = `'Spline Sans', 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
const APP_HEADER_HEIGHT = 76;
const NANA_HAND_FOOTER_HEIGHT_DESKTOP = 143;
const NANA_HAND_FOOTER_HEIGHT_MOBILE = 121;
const NANA_PLAYER_BAR_HEIGHT_MOBILE = 132;
const NANA_TAB_HEIGHT_MOBILE = 52;
const PLAYER_COLORS = ["#0496ff", "#ff5c8d", "#ffbc42", "#06d6a0", "#9d4edd", "#ec4899"];

function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── モバイル判定 ─────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [m, setM] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

// ── 型 ──────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  playerId: string;
  player: string;
  msg: string;
  tag?: string;
  tagColor?: string;
}

interface CardView {
  id: number;
  number: number | null;
}

function findVisibleCardNumber(state: NanaStateView, cardId: number): number | null {
  for (const c of state.fieldCards) {
    if (c?.id === cardId) return c.number;
  }
  for (const hand of Object.values(state.hands)) {
    const c = hand.find((h) => h.id === cardId);
    if (c) return c.number;
  }
  return null;
}


// ── 場札カード ───────────────────────────────────────────────────────

function FieldCardView({
  card,
  clickable,
  w,
  h,
  onClick,
}: {
  card: CardView | null;
  clickable: boolean;
  w: number;
  h: number;
  onClick?: () => void;
}) {
  if (card === null) {
    return (
      <div
        style={{
          width: w,
          height: h,
          border: `2px dashed ${C.border}`,
          borderRadius: 8,
          opacity: 0.35,
        }}
      />
    );
  }

  if (card.number !== null) {
    // 公開済み（turnFlips中）
    return (
      <div
        className="nana-card-revealed"
        style={{
          width: w,
          height: h,
          background: C.card,
          borderRadius: 8,
          border: `2px solid ${C.primary}`,
          boxShadow: `0 0 14px ${C.primaryBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontSize: Math.round(h * 0.36),
          fontWeight: 900,
          color: C.primary,
        }}
      >
        {card.number}
      </div>
    );
  }

  // 裏向き
  return (
    <div
      className={`nana-field-card${clickable ? " clickable" : ""}`}
      onClick={clickable ? onClick : undefined}
      style={{
        ...CARD_BACK_STYLE,
        width: w,
        height: h,
        borderRadius: 8,
        cursor: clickable ? "pointer" : "default",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    />
  );
}

// ── めくりスロット（3枠） ───────────────────────────────────────────

function TurnFlipsBar({
  flips,
  state,
  resolvedNumbers,
  getPlayerColor,
}: {
  flips: NanaStateView["turnFlips"];
  state: NanaStateView;
  resolvedNumbers?: Record<number, number | null>;
  getPlayerColor: (pid: string) => string;
}) {
  const findNum = (cardId: number): number | null =>
    resolvedNumbers?.[cardId] ?? findVisibleCardNumber(state, cardId);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map((i) => {
        const flip = flips[i];
        if (!flip) {
          return (
            <div
              key={i}
              style={{
                width: 52,
                height: 70,
                border: `2px dashed ${C.border}`,
                borderRadius: 8,
                opacity: 0.45,
              }}
            />
          );
        }
        const num = findNum(flip.cardId);
        const handSource = flip.source.type === "hand" ? flip.source : null;
        const accentColor = handSource ? getPlayerColor(handSource.targetPlayerId) : C.primary;
        const handPosLabel =
          handSource?.position === "max" ? "MAX" : handSource?.position === "min" ? "MIN" : null;
        return (
          <div
            key={i}
            className="nana-card-revealed"
            style={{
              position: "relative",
              width: 52,
              height: 70,
              background: C.card,
              border: `2px solid ${accentColor}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 22,
              fontWeight: 900,
              color: accentColor,
              boxShadow: `0 0 10px ${withAlpha(accentColor, 0.35)}`,
            }}
          >
            {handPosLabel && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  fontSize: 8,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "0.03em",
                  color: "white",
                  background: accentColor,
                  borderRadius: 999,
                  padding: "2px 5px",
                  boxShadow: `0 2px 6px ${withAlpha(accentColor, 0.35)}`,
                }}
              >
                {handPosLabel}
              </span>
            )}
            {num ?? "?"}
          </div>
        );
      })}
    </div>
  );
}

// ── 対戦相手エリア ───────────────────────────────────────────────────

function OpponentArea({
  pid,
  name,
  state,
  isMyTurn,
  onFlip,
  isCurrentPlayer,
  playerColor,
}: {
  pid: string;
  name: string;
  state: NanaStateView;
  isMyTurn: boolean;
  onFlip: (pos: "min" | "max") => void;
  isCurrentPlayer: boolean;
  playerColor: string;
}) {
  const hand = state.hands[pid] ?? [];
  const pendingResult = state.pendingResult ?? null;
  const flippedIds = state.turnFlips.map((f) => f.cardId);
  const activeCards = hand.filter((c) => !flippedIds.includes(c.id));
  const hasMin = activeCards.length > 0;
  const hasMax = activeCards.length > 0;
  const sets = state.collectedSets[pid] ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 6,
        padding: "10px",
        borderRadius: 14,
        border: `1px solid ${isCurrentPlayer ? withAlpha(playerColor, 0.45) : withAlpha(playerColor, 0.22)}`,
        background: isCurrentPlayer
          ? `linear-gradient(135deg, ${withAlpha(playerColor, 0.22)} 0%, ${C.card} 75%)`
          : `linear-gradient(135deg, ${withAlpha(playerColor, 0.09)} 0%, ${C.card} 70%)`,
        boxShadow: isCurrentPlayer
          ? `0 0 0 2px ${withAlpha(playerColor, 0.16)}, 0 10px 24px ${withAlpha(playerColor, 0.22)}`
          : `0 4px 14px ${withAlpha(playerColor, 0.12)}`,
        minWidth: 118,
      }}
    >
      {/* 1行目: 名前 / MIN MAX / 枚数 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: C.text,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            className={`nana-player-dot${isCurrentPlayer ? " active" : ""}`}
            aria-hidden="true"
            style={{
              color: playerColor,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "currentColor",
              boxShadow: `0 0 0 3px ${withAlpha(playerColor, 0.2)}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {(["min", "max"] as const).map((pos) => {
            const enabled = isMyTurn && pendingResult === null && (pos === "min" ? hasMin : hasMax);
            return (
              <button
                key={pos}
                className="nana-minmax-btn"
                disabled={!enabled}
                onClick={() => onFlip(pos)}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 7px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  background: "white",
                  cursor: enabled ? "pointer" : "not-allowed",
                  fontFamily: FONT,
                  color: C.text,
                }}
              >
                {pos === "min" ? "最小" : "最大"}
              </button>
            );
          })}
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: withAlpha(playerColor, 0.95),
            background: withAlpha(playerColor, 0.12),
            border: `1px solid ${withAlpha(playerColor, 0.35)}`,
            borderRadius: 999,
            padding: "1px 7px",
            flexShrink: 0,
          }}
        >
          {hand.length}枚
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 2 }}>
        {Array.from({ length: 3 }).map((_, i) => {
          const num = sets[i];
          return num !== undefined ? (
            <div
              key={i}
              style={{
                width: 26,
                height: 34,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${playerColor}, ${withAlpha(playerColor, 0.75)})`,
                color: "white",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px ${withAlpha(playerColor, 0.3)}`,
              }}
            >
              {num}
            </div>
          ) : (
            <div
              key={i}
              style={{
                width: 26,
                height: 34,
                borderRadius: 6,
                border: `1.5px dashed ${withAlpha(playerColor, 0.45)}`,
                color: withAlpha(playerColor, 0.4),
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 全プレイヤーの獲得セット ─────────────────────────────────────────

function AllCollectedSets({
  state,
  players,
  getPlayerColor,
}: {
  state: NanaStateView;
  players: { id: string; name: string }[];
  getPlayerColor: (pid: string) => string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.muted,
          marginBottom: 10,
        }}
      >
        獲得したセット
      </div>
      {players.map((p) => {
        const sets = state.collectedSets[p.id] ?? [];
        return (
          <div key={p.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: C.text,
                fontFamily: FONT,
                marginBottom: 5,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getPlayerColor(p.id),
                  flexShrink: 0,
                }}
              />
              {p.name}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sets.map((num, i) => (
                <div
                  key={i}
                  className="nana-set-acquired"
                  style={{
                    width: 36,
                    height: 48,
                    background: C.primary,
                    borderRadius: 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: 17,
                    boxShadow: "0 2px 8px rgba(244,157,37,0.35)",
                  }}
                >
                  {num}
                </div>
              ))}
              {/* 空スロット (最大3まで) */}
              {Array.from({ length: Math.max(0, 3 - sets.length) }).map((_, i) => (
                <div
                  key={`e${i}`}
                  style={{
                    width: 36,
                    height: 48,
                    border: `2px dashed ${C.border}`,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.border,
                    fontSize: 18,
                  }}
                >
                  +
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ゲームログ ────────────────────────────────────────────────────────

function GameLogPanel({
  logs,
  getPlayerColor,
}: {
  logs: LogEntry[];
  getPlayerColor: (pid: string) => string;
}) {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: C.muted,
          marginBottom: 12,
        }}
      >
        ゲームログ
      </div>
      {logs.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>
          まだログはありません
        </div>
      )}
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="nana-log-entry"
          style={{ display: "flex", gap: 6, marginBottom: 8, fontSize: 12 }}
        >
          <span
            style={{
              color: getPlayerColor(entry.playerId),
              fontWeight: 700,
              fontFamily: FONT,
              flexShrink: 0,
            }}
          >
            {entry.player}:
          </span>
          <span style={{ color: "#64748b", fontFamily: FONT, lineHeight: 1.4 }}>
            {entry.tag && (
              <span
                style={{
                  color: entry.tagColor ?? "#64748b",
                  fontWeight: 800,
                  marginRight: 6,
                }}
              >
                [{entry.tag}]
              </span>
            )}
            {entry.msg}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 状況パネル ────────────────────────────────────────────────────────

function StatusPanel({
  state,
  playerId,
  currentPlayerName,
}: {
  state: NanaStateView;
  playerId: string;
  currentPlayerName: string;
}) {
  const isMyTurn = state.playerIds[state.currentPlayerIndex] === playerId;
  const flipCount = state.turnFlips.length;

  return (
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
        現在の状況
      </div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${isMyTurn ? C.primaryBorder : C.border}`,
          background: isMyTurn ? C.primaryLight : "rgba(248,247,245,0.8)",
        }}
      >
        {isMyTurn ? (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.primary,
                margin: "0 0 4px",
                fontFamily: FONT,
              }}
            >
              あなたの番です
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                lineHeight: 1.5,
                margin: "0 0 6px",
                fontFamily: FONT,
              }}
            >
              {flipCount === 0
                ? "場か誰かの手札から1枚選んでください"
                : flipCount === 1
                  ? "もう1枚めくってください（同じ数字を狙おう）"
                  : "あと1枚！3枚揃えてセット獲得！"}
            </p>
            <p
              style={{
                fontSize: 11,
                color: C.primary,
                margin: 0,
                fontWeight: 600,
                fontFamily: FONT,
              }}
            >
              めくり: {flipCount} / 3
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                margin: "0 0 4px",
                fontFamily: FONT,
              }}
            >
              {currentPlayerName} の番
            </p>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0, fontFamily: FONT }}>
              めくり: {flipCount} / 3
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── ルール概要 ────────────────────────────────────────────────────────

function RulesPanel() {
  return (
    <div>
      <div
        style={{
          padding: "12px 14px",
          background: "#f8f7f5",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: C.text,
            fontFamily: FONT,
          }}
        >
          <span style={{ color: C.primary }}>ℹ</span> ルール概要
        </div>
        <ul
          style={{
            fontSize: 11,
            color: "#64748b",
            lineHeight: 1.7,
            paddingLeft: 0,
            listStyle: "none",
            margin: 0,
            fontFamily: FONT,
          }}
        >
          <li>• 同じ数字を3枚揃えると1セット</li>
          <li>• 3セット獲得で勝利！</li>
          <li>• 「7」のセットを揃えると即勝利</li>
          <li>• 2セットの和・差が7でも勝利</li>
        </ul>
      </div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────

export function NanaBoard() {
  const { gameState, playerId, sendMove, room, gameResult, startGame, leaveRoom } = useRoom();
  const state = gameState as NanaStateView | null;
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"game" | "log">("game");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const prevStateRef = useRef<NanaStateView | null>(null);
  const playersRef = useRef(room?.players ?? []);
  playersRef.current = room?.players ?? [];

  const getName = (pid: string) =>
    playersRef.current.find((p) => p.id === pid)?.name ?? pid;
  const getPlayerColor = (pid: string) => {
    const i = playersRef.current.findIndex((p) => p.id === pid);
    return PLAYER_COLORS[(i >= 0 ? i : 0) % PLAYER_COLORS.length];
  };

  // ── ログ生成 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev) return;

    const addLog = (
      playerId: string,
      msg: string,
      opts?: { tag?: string; tagColor?: string },
    ) => {
      const id = ++logIdRef.current;
      setLogs((l) => [
        { id, playerId, player: getName(playerId), msg, tag: opts?.tag, tagColor: opts?.tagColor },
        ...l,
      ].slice(0, 50));
    };

    if (state.turnFlips.length > prev.turnFlips.length) {
      const flip = state.turnFlips[state.turnFlips.length - 1];
      const actorPid = state.playerIds[state.currentPlayerIndex];
      const prevPendingResult = prev.pendingResult ?? null;
      const pendingResult = state.pendingResult ?? null;

      if (prevPendingResult === null && pendingResult === "failure") {
        if (flip.source.type === "field") {
          addLog(actorPid, "場のカードをめくりました", { tag: "Miss", tagColor: "#2563eb" });
        } else {
          addLog(actorPid, "プレイヤーのカードをめくりました", {
            tag: "Miss",
            tagColor: "#2563eb",
          });
        }
        return;
      }

      if (flip.source.type === "field") {
        addLog(actorPid, "場のカードをめくりました");
      } else {
        addLog(actorPid, "プレイヤーのカードをめくりました");
      }
      return;
    }

    const prevPendingResult = prev.pendingResult ?? null;
    const pendingResult = state.pendingResult ?? null;

    if (prevPendingResult === null && pendingResult === "failure") {
      const actorPid = state.playerIds[state.currentPlayerIndex];
      const lastFlip = state.turnFlips[state.turnFlips.length - 1];
      if (!lastFlip) {
        addLog(actorPid, "ターン終了", { tag: "Miss", tagColor: "#2563eb" });
      } else if (lastFlip.source.type === "field") {
        addLog(actorPid, "場のカードをめくりました", { tag: "Miss", tagColor: "#2563eb" });
      } else {
        addLog(actorPid, "プレイヤーのカードをめくりました", {
          tag: "Miss",
          tagColor: "#2563eb",
        });
      }
      return;
    }

    // confirm 後の成功反映（セット増加）
    if (prevPendingResult === "success" && pendingResult === null) {
      const actorPid = prev.playerIds[prev.currentPlayerIndex];
      const prevTotal = Object.values(prev.collectedSets).flat().length;
      const nextTotal = Object.values(state.collectedSets).flat().length;

      if (nextTotal > prevTotal) {
        for (const pid of state.playerIds) {
          const prevLen = prev.collectedSets[pid]?.length ?? 0;
          const nextLen = state.collectedSets[pid]?.length ?? 0;
          if (nextLen > prevLen) {
            const num = state.collectedSets[pid].at(-1)!;
            addLog(pid, `「${num}」のセットを獲得しました！`, {
              tag: "Match",
              tagColor: "#16a34a",
            });
          }
        }
      }
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 早期リターン ──────────────────────────────────────────────────
  if (!state || !playerId || !room) return null;

  // ── ゲーム結果オーバーレイ ───────────────────────────────────────
  const resultOverlay = gameResult ? (
    (() => {
      const winnerId = gameResult.ranking?.[0] ?? null;
      const myResult = winnerId === playerId ? "win" : "lose";
      const winnerName = room.players.find((p) => p.id === winnerId)?.name;
      return (
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
    })()
  ) : null;

  // ── 計算 ──────────────────────────────────────────────────────────
  const players = room.players;
  const pendingResult = state.pendingResult ?? null;
  const isMyTurn = state.playerIds[state.currentPlayerIndex] === playerId;
  const displayFlipEntries = state.turnFlips.map((flip) => ({
    flip,
    number: findVisibleCardNumber(state, flip.cardId),
  }));
  const displayTurnFlips = displayFlipEntries.map((e) => e.flip);
  const displayTurnFlipNumbers = Object.fromEntries(
    displayFlipEntries.map((e) => [e.flip.cardId, e.number]),
  );
  const displayTurnFlipIds = new Set(displayTurnFlips.map((f) => f.cardId));
  const turnFlipIds = new Set(state.turnFlips.map((f) => f.cardId));
  const myHand = state.hands[playerId] ?? [];
  const myActiveCards = myHand.filter((c) => !turnFlipIds.has(c.id));
  const myMinId = myActiveCards[0]?.id;
  const myMaxId = myActiveCards[myActiveCards.length - 1]?.id;
  const currentPlayerName = getName(state.playerIds[state.currentPlayerIndex]);
  const opponents = state.playerIds.filter((pid) => pid !== playerId);
  const myColor = getPlayerColor(playerId);

  // ── ムーブ送信 ────────────────────────────────────────────────────
  const handleFlipField = (index: number) => {
    sendMove({ type: "flip-field", fieldIndex: index } as NanaMove);
  };
  const handleFlipHand = (targetPlayerId: string, position: "min" | "max") => {
    sendMove({ type: "flip-hand", targetPlayerId, position } as NanaMove);
  };
  const handleConfirm = () => {
    sendMove({ type: "confirm" } as NanaMove);
  };

  // ── 場札グリッド ──────────────────────────────────────────────────
  const renderFieldGrid = (cardW: number, cardH: number) => {
    const fieldCount = state.fieldCards.length;
    const cols = fieldCount <= 6 ? 3 : fieldCount <= 8 ? 4 : 5;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cardW}px)`,
          gap: 10,
          justifyContent: "center",
        }}
      >
        {state.fieldCards.map((card, i) => {
          const clickable =
            isMyTurn && pendingResult === null && card !== null && !displayTurnFlipIds.has(card.id);
          const displayCard =
            card && displayTurnFlipIds.has(card.id)
              ? { ...card, number: displayTurnFlipNumbers[card.id] ?? card.number }
              : card;
          return (
            <FieldCardView
              key={i}
              card={displayCard}
              clickable={clickable}
              w={cardW}
              h={cardH}
              onClick={() => handleFlipField(i)}
            />
          );
        })}
      </div>
    );
  };

  // ── 自分の手札フッター ────────────────────────────────────────────
  const renderHandFooter = (cardW: number, cardH: number) => (
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
                  ? () => handleFlipHand(playerId, isMin ? "min" : "max")
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

  // ── めくりインジケーター ──────────────────────────────────────────
  const renderTurnFlips = () => {
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
            opacity: displayTurnFlips.length > 0 ? 1 : 0.65,
          }}
        >
          今ターンのカード
        </div>
        <TurnFlipsBar
          flips={displayTurnFlips}
          state={state}
          resolvedNumbers={displayTurnFlipNumbers}
          getPlayerColor={getPlayerColor}
        />
      </div>
    );
  };

  // ── 操作ガイドバナー ──────────────────────────────────────────────
  const renderGuideBanner = () => {
    if (!isMyTurn || pendingResult !== null || state.turnFlips.length >= 3) return null;
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
          {msgs[state.turnFlips.length]}
        </div>
      </div>
    );
  };

  const renderConfirmBanner = () => {
    if (!isMyTurn || pendingResult === null) return null;
    const isSuccess = pendingResult === "success";
    const label = isSuccess ? "確認してセット獲得" : "確認してターン終了";
    const bg = isSuccess ? "#16a34a" : "#2563eb";
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleConfirm}
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
  };

  const confirmBanner = renderConfirmBanner();
  const guideBanner = renderGuideBanner();
  const hasBottomAction = Boolean(confirmBanner || guideBanner);

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
                {opponents.map((pid) => (
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
            {renderTurnFlips()}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderFieldGrid(76, 101)}
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
              {confirmBanner}
              {guideBanner}
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
          {renderHandFooter(68, 91)}
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
            {renderTurnFlips()}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderFieldGrid(55, 73)}
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
                {confirmBanner}
                {guideBanner}
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
        {renderHandFooter(52, 69)}
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
          {opponents.map((pid) => (
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
