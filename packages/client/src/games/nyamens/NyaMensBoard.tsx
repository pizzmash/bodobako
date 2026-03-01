import type { NyaEventCard, NyaMensPlayerView } from "@bodobako/shared";
import { useEffect, useRef, useState } from "react";
import { GameResultCard } from "../../components/GameResultCard";
import { PlayingCard } from "../../components/PlayingCard";
import { useRoom } from "../../context/RoomContext";
import { API_BASE } from "../../lib/socket";
import { DrawCardsView } from "./DrawCardsView";
import "./nyamens.css";
import { PlayerHandArea } from "./PlayerHandArea";
import { RepairArea } from "./RepairArea";
import { VoteView } from "./VoteView";

const BG_CARD = "rgba(255,255,255,0.06)";
const ACCENT = "#0EA5E9";
const DANGER = "#DC2626";

function cardColor(num: number): string {
  if (num <= 10) return "#BAE6FD";
  if (num <= 20) return "#BBF7D0";
  return "#FED7AA";
}

// ---- ヘッダーと同じ PersonIcon SVG ----
const PersonIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
  </svg>
);

// ---- ヘッダーと同じアバター（円+PersonIcon） ----
function PlayerAvatar({ photoURL, name, size = 28 }: { photoURL?: string; name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1px solid rgba(99,102,241,0.35)",
        background: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6366F1",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {photoURL ? (
        <img src={photoURL} alt={name} referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      ) : (
        <PersonIcon size={size * 0.6} />
      )}
    </div>
  );
}

// ---- プレイヤーバー ----
function PlayerBar({
  state,
  myId,
  playerNames,
  photoURLs,
}: {
  state: NyaMensPlayerView;
  myId: string;
  playerNames: Record<string, string>;
  photoURLs: Record<string, string>;
}) {
  const { playerOrder, repairDutyIndex, otherHandCounts, myHand, readyPlayers, phase, assassinIds, myRole } = state;
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: "10px 12px",
        background: BG_CARD,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      {playerOrder.map((pid: string, idx: number) => {
        const isMe = pid === myId;
        const isDuty = idx === repairDutyIndex;
        const isReady = readyPlayers.includes(pid);
        const isKnownAssassin = assassinIds.includes(pid) || (isMe && myRole === "assassin");
        const handCount = isMe ? myHand.length : (otherHandCounts[pid] ?? 0);
        const name = playerNames[pid] ?? pid.slice(0, 10);
        return (
          <div
            key={pid}
            className={isDuty ? "nya-duty-pulse" : undefined}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              background: isDuty ? `${ACCENT}20` : "rgba(255,255,255,0.05)",
              border: isDuty ? `2px solid ${ACCENT}` : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: "0.78rem",
              color: isDuty ? ACCENT : "#94a3b8",
              fontWeight: isDuty ? 700 : 400,
              transition: "all 0.2s",
            }}
          >
            <PlayerAvatar photoURL={photoURLs[pid]} name={name} size={26} />
            <span>
              {name}{isMe ? <span style={{ color: "#475569", fontSize: "0.7rem" }}>（自分）</span> : ""}
            </span>
            {isKnownAssassin && (
              <span title="アサシン" style={{ fontSize: "0.85rem" }}>🗡️</span>
            )}
            {phase !== "finished" && (
              <span style={{ color: "#475569", fontSize: "0.7rem" }}>
                {phase === "role-reveal"
                  ? isReady ? "✓" : "..."
                  : `${handCount}枚`}
              </span>
            )}
            {isDuty && (
              <span style={{ fontSize: "0.8rem", marginLeft: 2 }} title="修理当番">🛠️</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- CSS 3D サイコロ ----
function Dice3D({
  rollingForResult,
  resultOverlay,
  diceResult,
}: {
  rollingForResult?: number | null;
  resultOverlay?: number | "!";
  diceResult?: number | null;
}) {
  const pip = (col: number, row: number) => (
    <span className="nya-dice-pip" style={{ gridColumn: col, gridRow: row }} />
  );

  const pipLayout: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [[3, 1], [1, 3]],
    3: [[3, 1], [2, 2], [1, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
  };

  const topPips = diceResult && pipLayout[diceResult]
    ? pipLayout[diceResult].map(([col, row]) => pip(col, row))
    : [pip(1, 1), pip(3, 1), pip(1, 3), pip(3, 3)]; // fallback: 4

  const rollingClass = rollingForResult ? `nya-dice-rolling-${rollingForResult}` : "";
  return (
    <div className="nya-dice-scene" style={{ position: "relative" }}>
      <div className={rollingClass ? `nya-dice-3d ${rollingClass}` : "nya-dice-3d"}>
        {/* front: 1 */}
        <div className="nya-dice-face nya-face-front">{pip(2, 2)}</div>
        {/* back: 6 */}
        <div className="nya-dice-face nya-face-back">
          {pip(1, 1)}{pip(3, 1)}{pip(1, 2)}{pip(3, 2)}{pip(1, 3)}{pip(3, 3)}
        </div>
        {/* right: 2 */}
        <div className="nya-dice-face nya-face-right">{pip(3, 1)}{pip(1, 3)}</div>
        {/* left: 5 */}
        <div className="nya-dice-face nya-face-left">
          {pip(1, 1)}{pip(3, 1)}{pip(2, 2)}{pip(1, 3)}{pip(3, 3)}
        </div>
        {/* top: diceResult */}
        <div className="nya-dice-face nya-face-top">{topPips}</div>
        {/* bottom: 3 */}
        <div className="nya-dice-face nya-face-bottom">{pip(3, 1)}{pip(2, 2)}{pip(1, 3)}</div>
      </div>
      {resultOverlay !== undefined && (
        <div
          className="nya-result-reveal"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            fontWeight: 900,
            color: "#4338CA",
            background: "rgba(255,255,255,0.92)",
            borderRadius: 10,
          }}
        >
          {resultOverlay}
        </div>
      )}
    </div>
  );
}

// ---- フェーズバナー ----
function PhaseBanner({ text, color = ACCENT }: { text: string; color?: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "8px 16px",
        background: `${color}18`,
        borderRadius: 10,
        border: `1px solid ${color}40`,
        color: color,
        fontWeight: 700,
        fontSize: "0.85rem",
      }}
    >
      {text}
    </div>
  );
}

// ---- 待機ドット ----
function WaitingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`nya-dot-${i}`}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#94a3b8",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

// ---- メインコンポーネント ----
export function NyaMensBoard() {
  const { gameState, sendMove, playerId, room, startGame, leaveRoom } = useRoom();
  const state = gameState as NyaMensPlayerView | null;
  const [selectedRevealedCard, setSelectedRevealedCard] = useState<number | null>(null);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const [diceShowingResult, setDiceShowingResult] = useState(false);
  // ロールごとにインクリメント → Dice3D を強制 remount してアニメーションを確実に再起動
  const [diceKey, setDiceKey] = useState(0);
  // サイコロ結果をローカルに保持（state.diceResult は1/6で即nullリセットされるため）
  const [capturedDiceResult, setCapturedDiceResult] = useState<number | null>(null);
  const [tuningStep, setTuningStep] = useState<"choose-track" | "choose-card">("choose-track");
  const [tuningTrack, setTuningTrack] = useState<"up" | "down" | null>(null);
  // チューニング: トラックのトップを手札に戻す際の表示用
  const [tuningReturnedCard, setTuningReturnedCard] = useState<number | null>(null);
  // playerId → プロフィール写真URL
  const [photoURLs, setPhotoURLs] = useState<Record<string, string>>({});

  // ロール検知用（全員共通 — 自分がロールした場合もサーバー応答後にアニメーション開始）
  const prevPhaseRef = useRef<string | null>(null);
  const prevDutyIndexRef = useRef<number | null>(null);

  // 誰かがロールしたときにアニメーションを再生（全員共通）
  useEffect(() => {
    if (!state) return;
    const prevPhase = prevPhaseRef.current;
    const prevDutyIndex = prevDutyIndexRef.current;
    prevPhaseRef.current = state.phase;
    prevDutyIndexRef.current = state.repairDutyIndex;
    if (prevPhase === null) return; // 初回レンダリングはスキップ

    const rollJustHappened =
      (prevPhase === "dice-roll" && state.phase !== "dice-roll") ||
      (prevPhase === "dice-roll" && state.phase === "dice-roll" && prevDutyIndex !== state.repairDutyIndex);

    if (rollJustHappened) {
      // 結果をキャプチャしてから出目に対応するアニメーションを再生
      setCapturedDiceResult(state.diceResult);
      setDiceKey((k) => k + 1);
      setDiceAnimating(true);
      setDiceShowingResult(false);
      const t1 = setTimeout(() => {
        setDiceAnimating(false);
        setDiceShowingResult(true);
      }, 950);
      const t2 = setTimeout(() => setDiceShowingResult(false), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.repairDutyIndex]);

  // playerId → 表示名のマップ
  const playerNames: Record<string, string> = {};
  if (room) {
    for (const p of room.players) {
      playerNames[p.id] = p.name;
    }
  }
  const nameOf = (id: string) => playerNames[id] ?? id.slice(0, 10);

  // プロフィール写真を取得（ヘッダーと同じ API）
  useEffect(() => {
    if (!room) return;
    const userIds = room.players
      .map((p) => ({ id: p.id, uid: p.userId }))
      .filter((p): p is { id: string; uid: string } => Boolean(p.uid));
    if (userIds.length === 0) return;
    let canceled = false;
    void (async () => {
      const results = await Promise.all(
        userIds.map(async ({ id, uid }) => {
          try {
            const res = await fetch(`${API_BASE}/users/${uid}/profile`);
            if (!res.ok) return null;
            const profile = await res.json() as { photoURL?: string };
            return profile.photoURL ? { id, photoURL: profile.photoURL } : null;
          } catch {
            return null;
          }
        })
      );
      if (canceled) return;
      const next: Record<string, string> = {};
      for (const r of results) {
        if (r) next[r.id] = r.photoURL;
      }
      setPhotoURLs(next);
    })();
    return () => { canceled = true; };
  }, [room]);

  if (!state || !playerId) {
    return (
      <div style={{ color: "#94a3b8", textAlign: "center", padding: 40, fontSize: "0.9rem" }}>
        ゲーム状態を読み込み中...
      </div>
    );
  }

  const myId = playerId;
  const dutyPlayer = state.playerOrder[state.repairDutyIndex] ?? "";
  const isDuty = dutyPlayer === myId;
  const dutyName = nameOf(dutyPlayer);

  const send = (move: object) => sendMove(move);

  // ---- role-reveal ----
  if (state.phase === "role-reveal") {
    const alreadyReady = state.readyPlayers.includes(myId);
    const isAssassin = state.myRole === "assassin";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 500, margin: "0 auto" }}>
        <PlayerBar state={state} myId={myId} playerNames={playerNames} photoURLs={photoURLs} />

        {/* 役職カード */}
        <div
          className="nya-card-flip"
          style={{
            borderRadius: 20,
            padding: 32,
            background: isAssassin ? `${DANGER}22` : `${ACCENT}18`,
            border: `3px solid ${isAssassin ? DANGER : ACCENT}`,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: "3rem" }}>{isAssassin ? "🗡️" : "😺"}</div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: isAssassin ? "#fca5a5" : ACCENT,
            }}
          >
            {isAssassin ? "アサシン" : "ニャーメンズ"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            {isAssassin
              ? "あなたは裏切り者です。修理を妨害しましょう。"
              : "あなたは隊員です。全30枚のカードを修理しましょう。"}
          </div>

          {/* アサシン同士の認識 */}
          {isAssassin && state.assassinIds.length > 0 && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: `${DANGER}20`,
                borderRadius: 10,
                color: "#fca5a5",
                fontSize: "0.8rem",
              }}
            >
              仲間のアサシン: {state.assassinIds.map((id: string) => nameOf(id)).join("、")}
            </div>
          )}
          {isAssassin && state.assassinIds.length === 0 && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 10,
                color: "#64748b",
                fontSize: "0.78rem",
              }}
            >
              あなた一人のアサシン（仲間なし）
            </div>
          )}
        </div>

        <div style={{ color: "#64748b", fontSize: "0.75rem", textAlign: "center" }}>
          準備完了: {state.readyPlayers.length} / {state.playerOrder.length} 人
        </div>

        <button
          disabled={alreadyReady}
          onClick={() => send({ type: "role-ready" })}
          style={{
            padding: "12px 32px",
            borderRadius: 12,
            border: "none",
            background: alreadyReady ? "#374151" : ACCENT,
            color: alreadyReady ? "#6b7280" : "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: alreadyReady ? "default" : "pointer",
            boxShadow: alreadyReady ? "none" : `0 0 16px ${ACCENT}60`,
            transition: "all 0.2s",
          }}
        >
          {alreadyReady ? "待機中..." : "準備完了"}
        </button>
      </div>
    );
  }

  // ---- 共通レイアウト ----
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" }}>
      {/* イベントキュー表示 */}
      {state.eventQueue.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>次のイベント:</span>
          {state.eventQueue.map((ev: NyaEventCard, i: number) => (
            <span
              key={i}
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: "0.7rem",
                color: "#94a3b8",
              }}
            >
              {ev === "okami" ? "🐺" : ev === "shirokuma" ? "🐻‍❄️" : "🎵"}
              {ev}
            </span>
          ))}
        </div>
      )}

      {/* 終了時リザルト＋勝利理由（リペアボードより上） */}
      {state.phase === "finished" && room && (() => {
        const isWinner =
          (state.result?.winner === "nyamens" && state.myRole === "nyamens") ||
          (state.result?.winner === "assassin" && state.myRole === "assassin");
        const winnerTeam = state.result?.winner === "nyamens" ? "ニャーメンズ" : "アサシン";
        const reasonLabel: Record<string, string> = {
          "repair-complete": "🔧 全カード修理完了！",
          "correct-arrest": "🎯 アサシンを正しく逮捕！",
          "no-assassin": "🕊️ アサシン不在で修理失敗も無投票勝利",
          "wrong-arrest": "💀 無実のプレイヤーを逮捕してしまいました",
          "missed-assassin": "👻 アサシンを特定できませんでした",
        };
        const winColor = state.result?.winner === "nyamens" ? ACCENT : DANGER;
        return (
          <>
            <GameResultCard
              result={isWinner ? "win" : "lose"}
              winnerName={isWinner ? undefined : `${winnerTeam}チーム`}
              isHost={room.hostId === myId}
              onRematch={startGame}
              onLeave={leaveRoom}
            />
            {state.result && (
              <div style={{ background: `${winColor}12`, border: `1px solid ${winColor}40`, borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                <span style={{ color: winColor, fontWeight: 700, fontSize: "0.88rem" }}>
                  {state.result.winner === "nyamens" ? "ニャーメンズの勝利！" : "アサシンの勝利..."}&ensp;
                  {reasonLabel[state.result.reason] ?? ""}
                </span>
              </div>
            )}
          </>
        );
      })()}

      {/* プレイヤーバー（リペアボード直前、終了時は非表示） */}
      {state.phase !== "finished" && (
        <PlayerBar state={state} myId={myId} playerNames={playerNames} photoURLs={photoURLs} />
      )}

      {/* 修理トラック（終了時は非表示） */}
      {state.phase !== "finished" && (
        <RepairArea
          track={state.track}
          burnedCards={state.burnedCards}
          drawPileCount={state.drawPileCount}
          isDrawPhaseMyTurn={state.phase === "draw-cards" && state.drawQueue?.[0] === myId}
          onDraw={() => send({ type: "draw-card" })}
          revealedCards={
            state.phase === "repair" || state.phase === "vote"
              ? state.revealedCards
              : undefined
          }
          isDuty={isDuty && state.phase === "repair"}
          onPlaceCard={(card, dest) => send({ type: "place-card", card, destination: dest })}
          selectedRevealedCard={selectedRevealedCard}
          onSelectRevealedCard={setSelectedRevealedCard}
          revealedCardsLabel={
            state.phase === "vote" ? "置けなかったカード（修理失敗）" : undefined
          }
        />
      )}

      {/* ---- フェーズ別アクションエリア ---- */}

      {/* dice-roll（アニメーション中・結果表示中はフェーズ移行後も継続表示） */}
      {(state.phase === "dice-roll" || diceAnimating || diceShowingResult) && (
        <div
          style={{
            background: BG_CARD,
            borderRadius: 14,
            padding: "20px 16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          {state.okamiActive && state.phase === "dice-roll" && (
            <PhaseBanner text="🐺 オオカミ発動中 — 次のターンは全員最低1枚！" color="#D97706" />
          )}

          {/* サイコロ - 全員に表示。key が変わるたびに remount → アニメーション確実に再起動 */}
          <Dice3D
            key={diceKey}
            rollingForResult={diceAnimating || diceShowingResult ? capturedDiceResult : null}
            resultOverlay={diceShowingResult ? (capturedDiceResult ?? "!") : undefined}
            diceResult={capturedDiceResult}
          />

          {isDuty && state.phase === "dice-roll" && (
            <>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                サイコロを振って必要なカード枚数を決めてください
              </div>
              <button
                onClick={() => {
                  send({ type: "roll-dice" });
                  // アニメーションはサーバー応答（state変化）後に unified useEffect が開始する
                }}
                style={{
                  padding: "12px 32px",
                  borderRadius: 12,
                  border: "none",
                  background: ACCENT,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: `0 0 16px ${ACCENT}60`,
                }}
              >
                🎲 サイコロを振る
              </button>
            </>
          )}

          {!isDuty && state.phase === "dice-roll" && !diceAnimating && (
            <div style={{ color: "#94a3b8", fontSize: "0.88rem" }}>
              {dutyName} がサイコロを振っています
              <WaitingDots />
            </div>
          )}
        </div>
      )}

      {/* card-selection（バナーのみサイコロ表示が消えてから表示、手札等は常に表示） */}
      {state.phase === "card-selection" && (
        <>
          {!diceAnimating && !diceShowingResult && !state.okamiActive && state.diceResult !== null && (
            <PhaseBanner
              text={`🎲 サイコロの目: ${state.diceResult} — 全員で合計${state.diceResult}枚のカードを選んでください`}
            />
          )}
          {!diceAnimating && !diceShowingResult && state.okamiActive && (
            <PhaseBanner text="🐺 オオカミ発動！全員最低1枚カードを選んでください" color="#D97706" />
          )}
          <PlayerHandArea
            state={state}
            myId={myId}
            playerNames={playerNames}
            onSelectCards={(cards) => send({ type: "select-cards", cards })}
            onConfirm={() => send({ type: "confirm-submission" })}
          />
        </>
      )}

      {/* repair */}
      {state.phase === "repair" && !isDuty && (
        <PhaseBanner text={`${dutyName} が修理中...`} color="#94a3b8" />
      )}

      {/* draw-cards */}
      {state.phase === "draw-cards" && (
        <DrawCardsView
          state={state}
          myId={myId}
          playerNames={playerNames}
          onDraw={() => send({ type: "draw-card" })}
        />
      )}

      {/* event-shirokuma */}
      {state.phase === "event-shirokuma" && (
        <div
          className="nya-event-banner"
          style={{
            background: "rgba(14, 165, 233, 0.12)",
            border: "2px solid rgba(14,165,233,0.4)",
            borderRadius: 14,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#7DD3FC" }}>
            🐻‍❄️ シロクマ！
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            1名を指名してください。その手札からランダムに1枚が修理に使われます。
          </div>
          {isDuty ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state.playerOrder.map((pid: string) => {
                const handCount = pid === myId ? state.myHand.length : (state.otherHandCounts[pid] ?? 0);
                return (
                  <button
                    key={pid}
                    onClick={() => send({ type: "shirokuma-target", playerId: pid })}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "2px solid rgba(14,165,233,0.4)",
                      background: "rgba(14,165,233,0.1)",
                      color: "#7DD3FC",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      transition: "all 0.15s",
                    }}
                  >
                    <PlayerAvatar photoURL={photoURLs[pid]} name={nameOf(pid)} size={22} />
                    {nameOf(pid)}{pid === myId ? "（自分）" : ""}
                    <span style={{ color: "#475569", fontSize: "0.7rem", marginLeft: 4 }}>
                      {handCount}枚
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
              {dutyName} が対象を選んでいます
              <WaitingDots />
            </div>
          )}
        </div>
      )}

      {/* event-tuning */}
      {state.phase === "event-tuning" && (
        <div
          className="nya-event-banner"
          style={{
            background: "rgba(139,92,246,0.12)",
            border: "2px solid rgba(139,92,246,0.4)",
            borderRadius: 14,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#C4B5FD" }}>
            🎵 チューニング！
          </div>

          {isDuty ? (
            tuningStep === "choose-track" ? (
              <>
                <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                  UP または DOWN トラックのトップカードを手札と交換してください。
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={state.track.up.length === 0}
                    onClick={() => {
                      const top = state.track.up[state.track.up.length - 1]!;
                      setTuningReturnedCard(top);
                      setTuningTrack("up");
                      setTuningStep("choose-card");
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "2px solid #10B981",
                      background: state.track.up.length > 0 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                      color: state.track.up.length > 0 ? "#34D399" : "#374151",
                      fontWeight: 700,
                      cursor: state.track.up.length > 0 ? "pointer" : "not-allowed",
                      fontSize: "0.85rem",
                    }}
                  >
                    ▲ UP トップ: {state.track.up.length > 0 ? state.track.up[state.track.up.length - 1] : "空"}
                  </button>
                  <button
                    disabled={state.track.down.length === 0}
                    onClick={() => {
                      const top = state.track.down[state.track.down.length - 1]!;
                      setTuningReturnedCard(top);
                      setTuningTrack("down");
                      setTuningStep("choose-card");
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "2px solid #F59E0B",
                      background: state.track.down.length > 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.03)",
                      color: state.track.down.length > 0 ? "#FCD34D" : "#374151",
                      fontWeight: 700,
                      cursor: state.track.down.length > 0 ? "pointer" : "not-allowed",
                      fontSize: "0.85rem",
                    }}
                  >
                    ▼ DOWN トップ: {state.track.down.length > 0 ? state.track.down[state.track.down.length - 1] : "空"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* チューニング: トップを手元に回収した後の状態を表示 */}
                {(() => {
                  const isUp = tuningTrack === "up";
                  const trackAfter = isUp
                    ? state.track.up.slice(0, -1)
                    : state.track.down.slice(0, -1);
                  const newTop = trackAfter.length > 0 ? trackAfter[trackAfter.length - 1] : null;
                  // 手札 + 回収したカード
                  const displayHand = tuningReturnedCard !== null
                    ? [...state.myHand, tuningReturnedCard]
                    : [...state.myHand];

                  return (
                    <>
                      <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                        {isUp ? "▲ UP" : "▼ DOWN"} のトップ
                        <strong style={{ color: "#C4B5FD", margin: "0 4px" }}>
                          {tuningReturnedCard}
                        </strong>
                        を手元に回収しました。代わりに置くカードを選んでください。
                      </div>
                      {newTop !== null && (
                        <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                          {isUp ? "▲ UP" : "▼ DOWN"} の現在のトップ:
                          <strong style={{ color: isUp ? "#34D399" : "#FCD34D", margin: "0 4px" }}>
                            {newTop}
                          </strong>
                          → {isUp ? `${newTop}より大きい` : `${newTop}より小さい`}カードを選んでください
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {displayHand.map((card: number) => {
                          const valid = newTop === null
                            ? true
                            : isUp ? card > newTop : card < newTop;
                          const isReturned = card === tuningReturnedCard;
                          return (
                            <PlayingCard
                              key={`${card}-${isReturned ? "ret" : "hand"}`}
                              label={card}
                              width={44}
                              height={54}
                              faceBackground={valid ? cardColor(card) : "#374151"}
                              textColor={valid ? "#1a1a2e" : "#6b7280"}
                              borderColor={isReturned ? "#C4B5FD" : "transparent"}
                              clickable={valid}
                              onClick={() => {
                                if (!valid || !tuningTrack) return;
                                send({ type: "tuning-swap", trackChoice: tuningTrack, replacementCard: card });
                                setTuningStep("choose-track");
                                setTuningTrack(null);
                                setTuningReturnedCard(null);
                              }}
                              style={{
                                fontSize: "1rem",
                                opacity: valid ? 1 : 0.4,
                                cursor: valid ? "pointer" : "not-allowed",
                                border: isReturned ? "2px dashed #C4B5FD" : "2px solid transparent",
                              }}
                            />
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          setTuningStep("choose-track");
                          setTuningTrack(null);
                          setTuningReturnedCard(null);
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "1px solid #374151",
                          background: "transparent",
                          color: "#64748b",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          alignSelf: "flex-start",
                        }}
                      >
                        ← 戻る
                      </button>
                    </>
                  );
                })()}
              </>
            )
          ) : (
            <div style={{ color: "#64748b", fontSize: "0.82rem" }}>
              {dutyName} がチューニング中
              <WaitingDots />
            </div>
          )}
        </div>
      )}

      {/* vote */}
      {state.phase === "vote" && (
        <VoteView
          state={state}
          myId={myId}
          playerNames={playerNames}
          photoURLs={photoURLs}
          onVote={(target) => send({ type: "vote", target })}
        />
      )}

      {/* 自分の手札（修理・その他フェーズでも表示。draw-cards は DrawCardsView 内で表示） */}
      {(state.phase === "dice-roll" ||
        state.phase === "repair" ||
        state.phase === "event-shirokuma" ||
        state.phase === "event-tuning") && (
        <div
          style={{
            background: BG_CARD,
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
            自分の手札 ({state.myHand.length}枚)
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {state.myHand.map((card: number) => (
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
            {state.myHand.length === 0 && (
              <span style={{ color: "#475569", fontSize: "0.75rem" }}>空</span>
            )}
          </div>
        </div>
      )}

      {/* ---- 終了フェーズ: 投票結果 + 役職（統合・一番下） ---- */}
      {state.phase === "finished" && (state.votes || state.revealedRoles) && (
        <div style={{ background: BG_CARD, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 8 }}>投票結果 / 役職</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {state.playerOrder.map((pid: string) => {
              const vote = state.votes?.[pid];
              const role = state.revealedRoles?.[pid];
              const isAssassin = role === "assassin";
              const voteTargetName = vote === "none" ? "無投票" : vote ? nameOf(vote) : undefined;
              const isNoneVote = vote === "none";
              return (
                <div
                  key={pid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.8rem",
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: isAssassin ? "rgba(220,38,38,0.08)" : role ? "rgba(14,165,233,0.08)" : "rgba(0,0,0,0.03)",
                    border: role ? `1px solid ${isAssassin ? "rgba(220,38,38,0.3)" : "rgba(14,165,233,0.3)"}` : "1px solid transparent",
                  }}
                >
                  <PlayerAvatar photoURL={photoURLs[pid]} name={nameOf(pid)} size={24} />
                  <span style={{ color: "#1e293b", fontWeight: 600, minWidth: 80 }}>
                    {nameOf(pid)}{pid === myId ? <span style={{ color: "#64748b", fontSize: "0.68rem", fontWeight: 400 }}>（自分）</span> : ""}
                  </span>
                  {voteTargetName !== undefined ? (
                    <>
                      <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>→</span>
                      {!isNoneVote && vote && <PlayerAvatar photoURL={photoURLs[vote]} name={voteTargetName} size={20} />}
                      <span style={{ color: isNoneVote ? "#94a3b8" : "#dc2626", fontWeight: isNoneVote ? 400 : 600, fontSize: "0.78rem" }}>
                        {voteTargetName}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: "#cbd5e1", fontSize: "0.72rem" }}>—</span>
                  )}
                  <span style={{ marginLeft: "auto", color: isAssassin ? "#dc2626" : role ? ACCENT : "transparent", fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                    {isAssassin ? "🗡️ アサシン" : role ? "😺 ニャーメンズ" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
