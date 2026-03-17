import type { NyaMensTrack } from "@bodobako/shared";
import { Flame, Package } from "lucide-react";
import { PlayingCard } from "../../components/PlayingCard";
import { Z } from "../../styles/tokens";
import { cardColor } from "./nyaUtils";

const TOTAL_REPAIR_CARDS = 30;

const UP_COLOR = "#10B981";
const DOWN_COLOR = "#F59E0B";
const RECYCLE_COLOR = "#6B7280";
const DRAW_PILE_BACK_COLOR = "#1e3a5f";
const DRAW_PILE_COLOR = "#3b82f6";

function CardChip({
  num,
  onClick,
  highlighted,
  small,
}: {
  num: number;
  onClick?: () => void;
  highlighted?: boolean;
  small?: boolean;
}) {
  const size = small ? 32 : 40;
  return (
    <PlayingCard
      label={num}
      width={size}
      height={size + 8}
      faceBackground={cardColor(num)}
      textColor="#1a1a2e"
      borderColor="transparent"
      clickable={!!onClick}
      highlighted={highlighted}
      onClick={onClick}
      style={{ fontSize: small ? "0.7rem" : "0.85rem", flexShrink: 0, borderRadius: 6 }}
    />
  );
}

function TrackStack({
  label,
  cards,
  color,
  arrow,
}: {
  label: string;
  cards: number[];
  color: string;
  arrow: "up" | "down";
}) {
  const top = cards.length > 0 ? cards[cards.length - 1] : null;
  const showCount = cards.length;

  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        border: `2px solid ${color}40`,
        borderRadius: 12,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        minHeight: 120,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: "1rem" }}>{arrow === "up" ? "▲" : "▼"}</span>
        <span style={{ color, fontWeight: 700, fontSize: "0.8rem" }}>{label}</span>
      </div>
      {top !== null ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <CardChip num={top} />
          {showCount > 1 && (
            <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>…{showCount}枚</span>
          )}
        </div>
      ) : (
        <div
          style={{
            width: 40,
            height: 48,
            border: `2px dashed ${color}40`,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: `${color}60`,
            fontSize: "0.7rem",
          }}
        >
          空
        </div>
      )}
          <span style={{ color: "#475569", fontSize: "0.65rem" }}>{showCount}/{TOTAL_REPAIR_CARDS}</span>
    </div>
  );
}

interface RepairAreaProps {
  track: NyaMensTrack;
  burnedCards: number[];
  drawPileCount: number;
  /** 補充フェーズ中、自分の補充ターン（山札をハイライト・クリック可能） */
  isDrawPhaseMyTurn?: boolean;
  /** 補充ターンに山札クリックで呼ぶ */
  onDraw?: () => void;
  /** 修理フェーズ中: 公開されたカードを当番がここに配置 */
  revealedCards?: number[] | null;
  isDuty?: boolean;
  onPlaceCard?: (card: number, dest: "up" | "down" | "recycle") => void;
  selectedRevealedCard?: number | null;
  onSelectRevealedCard?: (card: number | null) => void;
  /** 公開カードセクションのラベル（省略時はデフォルト文言） */
  revealedCardsLabel?: string;
}

function canGoUp(card: number, track: NyaMensTrack): boolean {
  if (track.up.length === 0) return true;
  return card > track.up[track.up.length - 1]!;
}

function canGoDown(card: number, track: NyaMensTrack): boolean {
  if (track.down.length === 0) return true;
  return card < track.down[track.down.length - 1]!;
}

export function RepairArea({
  track,
  burnedCards,
  drawPileCount,
  isDrawPhaseMyTurn = false,
  onDraw,
  revealedCards,
  isDuty,
  onPlaceCard,
  selectedRevealedCard,
  onSelectRevealedCard,
  revealedCardsLabel,
}: RepairAreaProps) {
  const sel = selectedRevealedCard ?? null;
  const canUp = sel !== null && canGoUp(sel, track);
  const canDown = sel !== null && canGoDown(sel, track);
  const canRecycle = sel !== null && track.recycleBox === null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 修理トラック */}
      <div style={{ display: "flex", gap: 8 }}>
        <TrackStack label="アップ" cards={track.up} color={UP_COLOR} arrow="up" />

        {/* リサイクルボックス */}
        <div
          style={{
            width: 72,
            flexShrink: 0,
            background: "rgba(255,255,255,0.04)",
            border: `2px solid ${RECYCLE_COLOR}40`,
            borderRadius: 12,
            padding: "12px 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Package size={14} color={RECYCLE_COLOR} />
          {track.recycleBox !== null ? (
            <CardChip num={track.recycleBox} small />
          ) : (
            <div
              style={{
                width: 32,
                height: 40,
                border: `2px dashed ${RECYCLE_COLOR}40`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `${RECYCLE_COLOR}60`,
                fontSize: "0.65rem",
              }}
            >
              空
            </div>
          )}
        </div>

        <TrackStack label="ダウン" cards={track.down} color={DOWN_COLOR} arrow="down" />

        {/* 山札（常時表示、補充ターンはハイライト） */}
        <div
          className={isDrawPhaseMyTurn && drawPileCount > 0 ? "nya-draw-pile-active" : undefined}
          style={{
            width: 60,
            flexShrink: 0,
            background: isDrawPhaseMyTurn && drawPileCount > 0
              ? "rgba(59,130,246,0.12)"
              : "rgba(255,255,255,0.04)",
            border: `2px solid ${isDrawPhaseMyTurn && drawPileCount > 0 ? DRAW_PILE_COLOR : `${DRAW_PILE_COLOR}40`}`,
            borderRadius: 12,
            padding: "12px 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            minHeight: 120,
            transition: "background 0.2s",
          }}
          onClick={isDrawPhaseMyTurn && drawPileCount > 0 ? onDraw : undefined}
        >
          <span style={{
            color: isDrawPhaseMyTurn && drawPileCount > 0 ? "#93c5fd" : DRAW_PILE_COLOR,
            fontWeight: 700,
            fontSize: "0.7rem",
          }}>山札</span>
          {drawPileCount > 0 ? (
            <div style={{ position: "relative", width: 38, height: 52, flexShrink: 0 }}>
              {drawPileCount > 2 && (
                <div style={{ position: "absolute", top: -5, left: 5, zIndex: Z.nyaDrawPileBack2 }}>
                  <PlayingCard faceDown backColor={DRAW_PILE_BACK_COLOR} width={36} height={48} style={{ opacity: 0.3, borderRadius: 5 }} />
                </div>
              )}
              {drawPileCount > 1 && (
                <div style={{ position: "absolute", top: -2, left: 2, zIndex: Z.nyaDrawPileBack1 }}>
                  <PlayingCard faceDown backColor={DRAW_PILE_BACK_COLOR} width={36} height={48} style={{ opacity: 0.6, borderRadius: 5 }} />
                </div>
              )}
              <div style={{ position: "relative", zIndex: Z.nyaDrawPileTop }}>
                <PlayingCard
                  faceDown
                  backColor={DRAW_PILE_BACK_COLOR}
                  width={36}
                  height={48}
                  clickable={isDrawPhaseMyTurn}
                  highlighted={isDrawPhaseMyTurn}
                  style={{ borderRadius: 5 }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 36,
                height: 48,
                border: `2px dashed ${DRAW_PILE_COLOR}40`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: `${DRAW_PILE_COLOR}60`,
                fontSize: "0.6rem",
              }}
            >
              空
            </div>
          )}
          <span style={{ color: isDrawPhaseMyTurn && drawPileCount > 0 ? "#93c5fd" : "#475569", fontSize: "0.6rem" }}>{drawPileCount}枚</span>
          {isDrawPhaseMyTurn && drawPileCount > 0 && (
            <span style={{
              fontSize: "0.55rem",
              color: "#7dd3fc",
              textAlign: "center",
              lineHeight: 1.3,
              fontWeight: 600,
            }}>▲引く</span>
          )}
        </div>
      </div>

      {/* 廃棄済みカード */}
      {burnedCards.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#475569", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: 2 }}><Flame size={12} className="inline mr-0.5" />廃棄:</span>
          {burnedCards.map((c) => (
            <div
              key={c}
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "#374151",
                color: "#6b7280",
                fontSize: "0.7rem",
                textDecoration: "line-through",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}

      {/* 公開されたカード（修理フェーズ） */}
      {revealedCards && revealedCards.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
            {revealedCardsLabel ?? `公開カード（${isDuty ? "配置先を選んでください" : "当番が配置中..."}）`}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {revealedCards.map((c) => (
              <PlayingCard
                key={c}
                className={sel === c ? undefined : "nya-card-appear"}
                label={c}
                width={44}
                height={54}
                faceBackground={cardColor(c)}
                textColor="#1a1a2e"
                borderColor="#fff"
                clickable={isDuty}
                highlighted={sel === c}
                onClick={() => {
                  if (!isDuty) return;
                  onSelectRevealedCard?.(sel === c ? null : c);
                }}
                style={{ fontSize: "1rem" }}
              />
            ))}
          </div>

          {/* 配置ボタン（当番のみ、カード選択後） */}
          {isDuty && sel !== null && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                disabled={!canUp}
                onClick={() => { onPlaceCard?.(sel, "up"); onSelectRevealedCard?.(null); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: canUp ? UP_COLOR : "#374151",
                  color: canUp ? "#fff" : "#6b7280",
                  fontWeight: 600,
                  cursor: canUp ? "pointer" : "not-allowed",
                  fontSize: "0.8rem",
                  transition: "all 0.15s",
                }}
              >
                ▲ アップに置く
              </button>
              <button
                disabled={!canDown}
                onClick={() => { onPlaceCard?.(sel, "down"); onSelectRevealedCard?.(null); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: canDown ? DOWN_COLOR : "#374151",
                  color: canDown ? "#1a1a2e" : "#6b7280",
                  fontWeight: 600,
                  cursor: canDown ? "pointer" : "not-allowed",
                  fontSize: "0.8rem",
                  transition: "all 0.15s",
                }}
              >
                ▼ ダウンに置く
              </button>
              <button
                disabled={!canRecycle}
                onClick={() => { onPlaceCard?.(sel, "recycle"); onSelectRevealedCard?.(null); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: canRecycle ? RECYCLE_COLOR : "#374151",
                  color: canRecycle ? "#fff" : "#6b7280",
                  fontWeight: 600,
                  cursor: canRecycle ? "pointer" : "not-allowed",
                  fontSize: "0.8rem",
                  transition: "all 0.15s",
                }}
              >
                <Package size={14} className="inline mr-1" /> リサイクル
              </button>
            </div>
          )}
        </div>
      )}

      {/* 修理進捗 */}
      <div style={{ display: "flex", gap: 16, fontSize: "0.75rem", color: "#64748b" }}>
        <span>▲ {track.up.length}枚</span>
        <span>▼ {track.down.length}枚</span>
        <span>合計 {track.up.length + track.down.length} / {TOTAL_REPAIR_CARDS - burnedCards.length}枚</span>
      </div>
    </div>
  );
}

