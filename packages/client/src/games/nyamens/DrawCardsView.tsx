import type { NyaCard, NyaEventCard, NyaMensPlayerView } from "@bodobako/shared";
import { useEffect, useRef, useState } from "react";
import { PlayingCard } from "../../components/PlayingCard";
import { cardColor } from "./nyaUtils";

// ---- イベントカード情報 ----
function eventInfo(ev: NyaEventCard): { emoji: string; name: string; desc: string; bg: string } {
  switch (ev) {
    case "okami":
      return {
        emoji: "🐺",
        name: "オオカミ",
        desc: "全員から強制的にカードを1枚ずつ公開させます",
        bg: "linear-gradient(135deg, #7c3aed, #4c1d95)",
      };
    case "shirokuma":
      return {
        emoji: "🐻‍❄️",
        name: "シロクマ",
        desc: "誰かの手札を1枚ランダムで強制公開します",
        bg: "linear-gradient(135deg, #0369a1, #0c4a6e)",
      };
    case "tuning":
      return {
        emoji: "🎵",
        name: "チューニング",
        desc: "トラックのカードと手札を交換します",
        bg: "linear-gradient(135deg, #7e22ce, #3b0764)",
      };
  }
}

// ---- イベントカードオーバーレイ ----
function EventCardOverlay({
  card,
  drawerName,
  isMe,
  onDismiss,
}: {
  card: NyaEventCard;
  drawerName: string;
  isMe: boolean;
  onDismiss: () => void;
}) {
  const info = eventInfo(card);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: info.bg,
          borderRadius: 24,
          padding: "36px 40px",
          maxWidth: 360,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "4rem", lineHeight: 1 }}>{info.emoji}</div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>{info.name}</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {isMe ? info.desc : `${drawerName} が ${info.name} を引きました`}
        </div>
      </div>
    </div>
  );
}

// ---- 数字カードオーバーレイ ----
function NumberCardOverlay({
  card,
  onDismiss,
}: {
  card: number;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      }}
      onClick={onDismiss}
    >
      <div style={{ color: "#fff", fontSize: "1rem", fontWeight: 600 }}>
        カードを引きました！
      </div>
      <PlayingCard
        label={card}
        width={100}
        height={130}
        faceBackground={cardColor(card)}
        textColor="#1a1a2e"
        borderColor="transparent"
        style={{ fontSize: "2.8rem", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      />
    </div>
  );
}

// ---- メインコンポーネント ----
interface DrawCardsViewProps {
  state: NyaMensPlayerView;
  myId: string;
  playerNames: Record<string, string>;
  onDraw: () => void;
}

export function DrawCardsView({ state, myId, playerNames, onDraw }: DrawCardsViewProps) {
  const { drawQueue, drawnCard, myHand, handSize, playerOrder } = state;
  const lastDrawer = state.lastDrawer ?? null;
  const currentDrawer = drawQueue[0] ?? null;
  // ACK待ち状態: 最後のカードを引いた後、キューが空になりオーバーレイ閉幕を待っている
  const isAckMode = drawQueue.length === 0 && lastDrawer === myId && drawnCard != null;
  // 自分の番 = currentDrawer一致 OR ACKモード OR 途中キューから外れたが自分が引いたカードを表示中
  const isMyTurn = currentDrawer === myId || isAckMode || (lastDrawer === myId && drawnCard != null);
  const myHandSize = myHand.length;
  // Roll 1/6 の補償ドローでは手札が満杯でも 1 枚引く
  const isDiceCompensation = state.diceResult === 1 || state.diceResult === 6;
  const needCount = isDiceCompensation && myHandSize >= handSize ? 1 : handSize - myHandSize;

  // オーバーレイ管理
  const [overlayCard, setOverlayCard] = useState<NyaCard | null>(null);
  const [overlayDrawerName, setOverlayDrawerName] = useState<string>("");
  // ACK二重送防止用 ref
  const ackSentRef = useRef(false);

  const sendAckIfNeeded = (ack: boolean) => {
    if (ack && !ackSentRef.current) {
      ackSentRef.current = true;
      onDraw();
    }
  };

  // 山札が空で自分の番のとき → 自動スキップ（サーバー側でスキップ処理）
  useEffect(() => {
    if (currentDrawer !== myId) return;
    if (state.drawPileCount !== 0) return;
    // ACKモード（最後のカード引いた後のオーバーレイ待ち）中は送らない
    // イベントカード引いた直後(drawnCard != null かつ queue残り)は送ってOK
    if (drawQueue.length === 0 && lastDrawer === myId && drawnCard != null) return;
    const t = setTimeout(() => onDraw(), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrawer, state.drawPileCount]);

  useEffect(() => {
    if (drawnCard == null) return;
    const ack = drawQueue.length === 0 && (state.lastDrawer ?? null) === myId;
    ackSentRef.current = false; // 新しいカードのたびにリセット
    // オーバーレイの引き手名: lastDrawer を優先使用
    const drawerId = state.lastDrawer ?? currentDrawer ?? "";
    const drawerName = playerNames[drawerId] ?? drawerId;
    setOverlayDrawerName(drawerName);
    setOverlayCard(drawnCard);
    // 2秒後に自動解除（ACKモードであれば onDraw も呼ぶ）
    const t = setTimeout(() => {
      setOverlayCard(null);
      sendAckIfNeeded(ack);
    }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnCard]);

  const drawerName = playerNames[currentDrawer ?? ""] ?? currentDrawer ?? "";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            background: "rgba(14,165,233,0.15)",
            border: "1px solid rgba(14,165,233,0.4)",
            borderRadius: 10,
            padding: "6px 14px",
            color: "#7DD3FC",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          🃏 手札補充フェーズ
        </div>
        <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
          {currentDrawer === myId
            ? `あと ${needCount}枚 引いてください`
            : `${drawerName} が引いています...`}
        </div>
      </div>

      {/* 補充キュー情報 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {drawQueue.map((pid, i) => {
          const name = playerNames[pid] ?? pid.slice(0, 10);
          const isFirst = i === 0;
          const handCount = pid === myId ? myHand.length : (state.otherHandCounts[pid] ?? 0);
          const remaining = isDiceCompensation && handCount >= handSize ? 1 : handSize - handCount;
          return (
            <div
              key={pid}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                borderRadius: 8,
                background: isFirst ? "rgba(14,165,233,0.1)" : "rgba(255,255,255,0.04)",
                border: isFirst ? "1px solid rgba(14,165,233,0.3)" : "1px solid transparent",
                fontSize: "0.78rem",
                color: isFirst ? "#7DD3FC" : "#64748b",
                fontWeight: isFirst ? 600 : 400,
              }}
            >
              {isFirst && <span style={{ fontSize: "0.9rem" }}>🎴</span>}
              <span>{name}{pid === myId ? "（自分）" : ""}</span>
              <span style={{ color: "#475569", fontSize: "0.7rem" }}>
                あと{remaining}枚
              </span>
            </div>
          );
        })}
      </div>

      {/* 自分の手札 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
          自分の手札 ({myHandSize}/{handSize}枚)
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {myHand.map((card) => (
            <PlayingCard
              key={card}
              label={card}
              width={36}
              height={44}
              faceBackground={cardColor(card)}
              textColor="#1a1a2e"
              borderColor="transparent"
              style={{ fontSize: "0.82rem", borderRadius: 6 }}
            />
          ))}
          {myHandSize === 0 && (
            <span style={{ color: "#475569", fontSize: "0.75rem" }}>空</span>
          )}
        </div>
      </div>

      {/* 他プレイヤーの手札枚数 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {playerOrder
          .filter((pid) => pid !== myId)
          .map((pid) => {
            const name = playerNames[pid] ?? pid.slice(0, 10);
            const count = state.otherHandCounts[pid] ?? 0;
            return (
              <div
                key={pid}
                style={{
                  fontSize: "0.7rem",
                  color: "#64748b",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: "3px 8px",
                }}
              >
                {name}: {count}枚
              </div>
            );
          })}
      </div>

      {/* オーバーレイ */}
      {overlayCard !== null && typeof overlayCard === "number" && isMyTurn && (
        <NumberCardOverlay card={overlayCard} onDismiss={() => {
          setOverlayCard(null);
          sendAckIfNeeded(isAckMode);
        }} />
      )}
      {overlayCard !== null && typeof overlayCard !== "number" && (
        <EventCardOverlay
          card={overlayCard}
          drawerName={overlayDrawerName}
          isMe={isMyTurn}
          onDismiss={() => {
            setOverlayCard(null);
            sendAckIfNeeded(isAckMode);
          }}
        />
      )}
    </div>
  );
}
