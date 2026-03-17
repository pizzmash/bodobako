import type { NyaMensPlayerView } from "@bodobako/shared";
import { PawPrint } from "lucide-react";
import { PlayingCard } from "../../components/PlayingCard";
import { NYAMENS_ACCENT as ACCENT } from "../../styles/tokens";
import { cardColor } from "./nyaUtils";

const PLAYER_COLORS = [
  "#0EA5E9", "#10B981", "#F59E0B", "#A855F7", "#EC4899",
];

interface PlayerHandAreaProps {
  state: NyaMensPlayerView;
  myId: string;
  playerNames: Record<string, string>;
  onSelectCards?: (cards: number[]) => void;
  onConfirm?: () => void;
}

export function PlayerHandArea({ state, myId, playerNames, onSelectCards, onConfirm }: PlayerHandAreaProps) {
  const {
    phase,
    myHand,
    mySelectedCards,
    totalSelectedCount,
    otherSelectedCounts,
    diceResult,
    okamiActive,
    playerOrder,
    repairDutyIndex,
    otherHandCounts,
  } = state;
  const isDuty = playerOrder[repairDutyIndex] === myId;

  if (phase !== "card-selection") return null;

  // 全手札合計がサイコロ結果より少ない場合は全手札が実効的な必要枚数
  const totalHandCards = myHand.length + Object.values(otherHandCounts).reduce((s, n) => s + n, 0);
  const required = okamiActive ? null : Math.min(diceResult ?? 0, totalHandCards);
  const myCount = mySelectedCards.length;

  const toggle = (card: number) => {
    if (!onSelectCards) return;
    const already = mySelectedCards.includes(card);
    if (already) {
      onSelectCards(mySelectedCards.filter((c: number) => c !== card));
    } else {
      onSelectCards([...mySelectedCards, card]);
    }
  };

  const confirmReady = isDuty
    ? okamiActive
      ? playerOrder.every((pid: string) => {
          if (pid === myId) return mySelectedCards.length >= 1;
          return true;
        }) && totalSelectedCount >= playerOrder.length
      : totalSelectedCount === required
    : false;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {okamiActive && (
          <span
            className="nya-event-banner"
            style={{
              background: "#854D0E",
              color: "#FEF08A",
              borderRadius: 8,
              padding: "3px 10px",
              fontWeight: 700,
              fontSize: "0.75rem",
            }}
          >
            <PawPrint size={12} className="inline mr-1" /> オオカミ！全員最低1枚
          </span>
        )}
        <span style={{ color: "#94a3b8", fontSize: "0.78rem", marginLeft: "auto" }}>
          {okamiActive
            ? `選択中: ${myCount}枚（全体: ${totalSelectedCount}枚）`
            : `必要: ${required}枚 / 全体選択: ${totalSelectedCount}枚`}
        </span>
      </div>

      {/* 手札 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {myHand.map((card: number) => {
          const selected = mySelectedCards.includes(card);
          return (
            <PlayingCard
              key={card}
              label={card}
              width={44}
              height={54}
              faceBackground={cardColor(card)}
              textColor="#1a1a2e"
              borderColor="#fff"
              clickable
              highlighted={selected}
              onClick={() => toggle(card)}
              style={{ fontSize: "1rem" }}
            />
          );
        })}
        {myHand.length === 0 && (
          <span style={{ color: "#475569", fontSize: "0.8rem" }}>手札なし</span>
        )}
      </div>

      {/* 当番の確定ボタン */}
      {isDuty && (
        <button
          disabled={!confirmReady}
          onClick={onConfirm}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: confirmReady ? ACCENT : "#374151",
            color: confirmReady ? "#fff" : "#6b7280",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: confirmReady ? "pointer" : "not-allowed",
            transition: "all 0.2s",
            boxShadow: confirmReady ? `0 0 12px ${ACCENT}80` : "none",
            alignSelf: "flex-end",
          }}
        >
          修理を確定する →
        </button>
      )}

      {/* 他プレイヤー提出状況（リアルタイム同期） */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {playerOrder
          .filter((pid: string) => pid !== myId)
          .map((pid: string) => {
            const globalIdx = playerOrder.indexOf(pid);
            const color = PLAYER_COLORS[globalIdx % PLAYER_COLORS.length]!;
            const selectedCount = otherSelectedCounts[pid] ?? 0;
            const handCount = otherHandCounts[pid] ?? 0;
            const name = playerNames[pid] ?? pid.slice(0, 10);
            const hasSelected = selectedCount > 0;
            return (
              <div
                key={pid}
                style={{
                  background: hasSelected ? `${color}18` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${hasSelected ? color + "50" : "transparent"}`,
                  borderRadius: 8,
                  padding: "5px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.72rem",
                  color: hasSelected ? color : "#94a3b8",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontWeight: hasSelected ? 700 : 400 }}>{name}</span>
                <span style={{ color: hasSelected ? color : "#475569" }}>
                  {hasSelected ? `${selectedCount}枚選択中` : `手札${handCount}枚`}
                </span>
                {hasSelected && <span style={{ fontSize: "0.8rem" }}>✓</span>}
              </div>
            );
          })}
      </div>
    </div>
  );
}
