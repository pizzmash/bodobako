import { useState, useEffect, useRef } from "react";
import { useRoom } from "../../context/RoomContext";
import { GameResultCard } from "../../components/GameResultCard";
import type { AiueBattleState, AiueBattleMove } from "@bodobako/shared";
import { BOARD_CHARS, TOPIC_LIST, WORD_LENGTH } from "@bodobako/shared";

/* ── Colour palette ── */
const C = {
  primary: "#4a6fa5",
  primaryLight: "#6b8fc5",
  primaryDark: "#3a5a8a",
  hit: "#e05555",
  hitBg: "#fff0f0",
  success: "#2d8a4e",
  warning: "#d9904a",
  bgMain: "#f8fafc",
  bgCard: "#ffffff",
  textMain: "#2d3748",
  textSub: "#718096",
  border: "#e2e8f0",
  borderDark: "#cbd5e0",
} as const;

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

/* ── CSS keyframes & utility classes (injected once) ── */
const INJECTED_STYLES = `
@keyframes ab-pulse {
  0%,100%{ opacity:1 }
  50%{ opacity:.6 }
}
@keyframes ab-shake {
  0%,100%{ transform:translateX(0) }
  15%{ transform:translateX(-6px) }
  30%{ transform:translateX(6px) }
  45%{ transform:translateX(-4px) }
  60%{ transform:translateX(4px) }
  75%{ transform:translateX(-2px) }
  90%{ transform:translateX(2px) }
}
@keyframes ab-missFade {
  0%{ opacity:1; transform:scale(1) }
  50%{ opacity:.5; transform:scale(.97) }
  100%{ opacity:1; transform:scale(1) }
}
@keyframes ab-fadeIn {
  from{ opacity:0; transform:translateY(8px) }
  to{ opacity:1; transform:translateY(0) }
}
@keyframes ab-celebrate {
  0%{ transform:scale(1) }
  25%{ transform:scale(1.08) rotate(-2deg) }
  50%{ transform:scale(1.12) rotate(2deg) }
  75%{ transform:scale(1.08) rotate(-1deg) }
  100%{ transform:scale(1) rotate(0) }
}
@keyframes ab-eliminate {
  from{ filter:grayscale(0); opacity:1 }
  to{ filter:grayscale(1); opacity:.55 }
}
@keyframes ab-reveal {
  0%{ transform:rotateX(90deg); opacity:0 }
  60%{ transform:rotateX(-10deg); opacity:1 }
  100%{ transform:rotateX(0) }
}
@keyframes ab-turnPulse {
  0%,100%{ box-shadow:0 0 0 0 rgba(74,111,165,.4) }
  50%{ box-shadow:0 0 0 10px rgba(74,111,165,0) }
}
@keyframes ab-charPop {
  0%{ transform:scale(0); opacity:0 }
  60%{ transform:scale(1.2) }
  100%{ transform:scale(1); opacity:1 }
}
@keyframes ab-slideUp {
  from{ opacity:0; transform:translateY(16px) }
  to{ opacity:1; transform:translateY(0) }
}
@keyframes ab-glowPulse {
  0%,100%{ box-shadow:0 0 8px rgba(74,111,165,.3) }
  50%{ box-shadow:0 0 20px rgba(74,111,165,.5) }
}
@keyframes ab-hitFlash {
  0%{ background:rgba(224,85,85,.3) }
  100%{ background:transparent }
}
@keyframes ab-spin {
  from{ transform:rotate(0deg) }
  to{ transform:rotate(360deg) }
}

/* hover / active classes */
.ab-topic-btn {
  transition: transform .15s, box-shadow .15s, border-color .15s !important;
}
.ab-topic-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(74,111,165,.2) !important;
  border-color: ${C.primary} !important;
}
.ab-topic-btn:active {
  transform: translateY(0) !important;
  box-shadow: 0 1px 4px rgba(74,111,165,.15) !important;
}
.ab-char-btn {
  transition: transform .12s, box-shadow .12s, background .12s !important;
}
.ab-char-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 3px 8px rgba(0,0,0,.12) !important;
  background: ${C.bgMain} !important;
}
.ab-char-btn:active:not(:disabled) {
  transform: scale(.95) !important;
}
.ab-battle-char {
  transition: transform .12s, box-shadow .12s, background .12s !important;
}
.ab-battle-char:hover:not(:disabled) {
  transform: scale(1.12) !important;
  box-shadow: 0 4px 12px rgba(74,111,165,.25) !important;
  background: ${C.primaryLight} !important;
  color: #fff !important;
  z-index: 2;
}
.ab-battle-char:active:not(:disabled) {
  transform: scale(.96) !important;
}
.ab-action-btn {
  transition: transform .12s, box-shadow .12s, filter .12s !important;
}
.ab-action-btn:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,.15) !important;
  filter: brightness(1.08) !important;
}
.ab-action-btn:active:not(:disabled) {
  transform: translateY(0) !important;
}
.ab-input:focus {
  outline: none !important;
  border-color: ${C.primary} !important;
  box-shadow: 0 0 0 3px rgba(74,111,165,.2) !important;
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "ab-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = INJECTED_STYLES;
    document.head.appendChild(tag);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}

/* ── Layout helpers ── */
const BOARD_LAYOUT: (string | null)[][] = [
  ["あ", "い", "う", "え", "お"],
  ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"],
  ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"],
  ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"],
  ["や", null, "ゆ", null, "よ"],
  ["ら", "り", "る", "れ", "ろ"],
  ["わ", null, "を", null, "ん"],
  ["ー"],
];

function charToIndex(char: string): number {
  return (BOARD_CHARS as readonly string[]).indexOf(char);
}

const PLAYER_COLORS = [C.primary, C.success, C.warning, C.hit, "#8b5cf6", "#ec4899"];

/* ── Main Component ── */
export function AiueBattleBoard() {
  const { gameState, playerId, sendMove, gameResult, room, startGame, leaveRoom } =
    useRoom();
  const state = gameState as AiueBattleState | null;
  const [wordChars, setWordChars] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [showWordConfirm, setShowWordConfirm] = useState(false);
  const [attackAnim, setAttackAnim] = useState<"hit" | "miss" | null>(null);
  const [newlyRevealed, setNewlyRevealed] = useState<Set<string>>(new Set());
  const prevRevealedRef = useRef<Record<string, (boolean | "end")[]>>({});

  useInjectStyles();

  // Track attack result changes for animation
  useEffect(() => {
    if (!state || state.phase !== "battle") return;
    if (state.lastAttackChar) {
      setAttackAnim(state.lastAttackHit ? "hit" : "miss");
      const timer = setTimeout(() => setAttackAnim(null), 600);
      return () => clearTimeout(timer);
    }
  }, [state?.lastAttackChar, state?.lastAttackHit, state?.phase]);

  // Track newly revealed cells for flip animation
  useEffect(() => {
    if (!state || state.phase !== "battle") return;
    const prev = prevRevealedRef.current;
    const fresh = new Set<string>();
    for (const pid of state.playerIds) {
      const rev = state.revealed[pid];
      const prevRev = prev[pid];
      if (rev) {
        rev.forEach((v, i) => {
          if (v && (!prevRev || !prevRev[i])) {
            fresh.add(`${pid}-${i}`);
          }
        });
      }
    }
    if (fresh.size > 0) {
      setNewlyRevealed(fresh);
      const timer = setTimeout(() => setNewlyRevealed(new Set()), 500);
      // snapshot current revealed state
      const snapshot: Record<string, (boolean | "end")[]> = {};
      for (const pid of state.playerIds) {
        if (state.revealed[pid]) snapshot[pid] = [...state.revealed[pid]];
      }
      prevRevealedRef.current = snapshot;
      return () => clearTimeout(timer);
    }
    // snapshot even if no new reveals
    const snapshot: Record<string, (boolean | "end")[]> = {};
    for (const pid of state.playerIds) {
      if (state.revealed[pid]) snapshot[pid] = [...state.revealed[pid]];
    }
    prevRevealedRef.current = snapshot;
  }, [state?.revealed, state?.phase, state?.playerIds]);

  if (!state || !playerId || !room) return null;

  const sendTypedMove = (move: AiueBattleMove) => sendMove(move);

  /* ─── Title ─── */
  const Title = (
    <h2
      style={{
        fontSize: "1.6rem",
        fontWeight: 800,
        margin: "0.5rem 0 0.25rem",
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontFamily: FONT,
        letterSpacing: "0.05em",
      }}
    >
      あいうえバトル
    </h2>
  );

  // --- Topic Select Phase ---
  if (state.phase === "topic-select") {
    const isSelector = playerId === state.topicSelectorId;
    const selectorName = room.players.find(
      (p) => p.id === state.topicSelectorId
    )?.name;

    return (
      <div style={styles.container}>
        {Title}
        {isSelector ? (
          <div style={{ animation: "ab-fadeIn .4s ease-out" }}>
            <p style={styles.subtitle}>お題を選んでください</p>
            <div style={styles.topicGrid}>
              {TOPIC_LIST.map((topic, i) => (
                <button
                  key={topic}
                  className="ab-topic-btn"
                  style={{
                    ...styles.topicButton,
                    animationDelay: `${i * 30}ms`,
                  }}
                  onClick={() => sendTypedMove({ type: "select-topic", topic })}
                >
                  {topic}
                </button>
              ))}
            </div>
            <div style={styles.customTopicRow}>
              <input
                className="ab-input"
                style={styles.input}
                placeholder="自由入力..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
              <button
                className="ab-action-btn"
                style={{
                  ...styles.submitButton,
                  opacity: customTopic.trim() ? 1 : 0.5,
                }}
                disabled={!customTopic.trim()}
                onClick={() =>
                  sendTypedMove({ type: "select-topic", topic: customTopic })
                }
              >
                決定
              </button>
            </div>
          </div>
        ) : (
          <p style={styles.waiting}>
            <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite" }}>
              {selectorName} がお題を選んでいます...
            </span>
          </p>
        )}
      </div>
    );
  }

  // --- Word Input Phase ---
  if (state.phase === "word-input") {
    const hasSubmitted = state.submittedPlayers.includes(playerId);

    return (
      <div style={styles.container}>
        {Title}
        <div style={styles.topicBadge}>
          お題: <strong>{state.topic}</strong>
        </div>

        {hasSubmitted ? (
          <div style={{ animation: "ab-fadeIn .4s ease-out", textAlign: "center" as const }}>
            <p style={styles.waiting}>
              <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite", display: "inline-block" }}>
                他のプレイヤーを待っています... ({state.submittedPlayers.length}/
                {state.playerIds.length})
              </span>
            </p>
          </div>
        ) : (
          <div style={{ animation: "ab-fadeIn .4s ease-out" }}>
            <p style={styles.subtitle}>
              2〜7文字の言葉を入力してください（濁点なし・大文字で）
            </p>

            <div style={styles.wordDisplay}>
              {Array.from({ length: WORD_LENGTH }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.wordCell,
                    ...(wordChars[i]
                      ? {
                          borderColor: C.primary,
                          background: "#f0f4ff",
                          animation: "ab-charPop .25s ease-out",
                        }
                      : {
                          borderColor: C.borderDark,
                          borderStyle: "dashed",
                        }),
                  }}
                >
                  {wordChars[i] ?? ""}
                </div>
              ))}
            </div>
            <p style={styles.charCount}>{wordChars.length} / {WORD_LENGTH} 文字</p>

            <div style={styles.kbCard}>
              <div style={styles.boardGrid}>
                {BOARD_LAYOUT.map((row, ri) => (
                  <div key={ri} style={styles.boardRow}>
                    {row.map((char, ci) =>
                      char ? (
                        <button
                          key={ci}
                          className="ab-char-btn"
                          style={styles.charButton}
                          disabled={wordChars.length >= WORD_LENGTH}
                          onClick={() => setWordChars([...wordChars, char])}
                        >
                          {char}
                        </button>
                      ) : (
                        <div key={ci} style={styles.charEmpty} />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                className="ab-action-btn"
                style={styles.backspaceButton}
                disabled={wordChars.length === 0}
                onClick={() => setWordChars(wordChars.slice(0, -1))}
              >
                削除
              </button>
              <button
                className="ab-action-btn"
                style={{
                  ...styles.submitButton,
                  opacity: wordChars.length >= 2 ? 1 : 0.5,
                }}
                disabled={wordChars.length < 2}
                onClick={() => setShowWordConfirm(true)}
              >
                送信
              </button>
            </div>

            {/* 回答確認モーダル */}
            {showWordConfirm && (
              <div style={styles.confirmOverlay} onClick={() => setShowWordConfirm(false)}>
                <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.confirmTitle}>この回答でよろしいですか？</div>
                  <div style={styles.confirmWord}>
                    {Array.from({ length: WORD_LENGTH }, (_, i) => {
                      const c = wordChars[i] ?? "×";
                      const isFiller = i >= wordChars.length;
                      return (
                        <span key={i} style={{
                          ...styles.confirmChar,
                          ...(isFiller ? { background: "#f5f5f5", borderColor: "#ccc", color: C.textSub } : {}),
                        }}>{c}</span>
                      );
                    })}
                  </div>
                  <div style={styles.confirmButtons}>
                    <button
                      className="ab-action-btn"
                      style={styles.confirmCancel}
                      onClick={() => setShowWordConfirm(false)}
                    >
                      戻る
                    </button>
                    <button
                      className="ab-action-btn"
                      style={styles.confirmSubmit}
                      onClick={() => {
                        sendTypedMove({ type: "submit-word", word: wordChars });
                        setWordChars([]);
                        setShowWordConfirm(false);
                      }}
                    >
                      決定
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- Battle Phase ---
  const currentPlayer = room.players.find(
    (p) => p.id === state.playerIds[state.currentPlayerIndex]
  );
  const isMyTurn =
    state.playerIds[state.currentPlayerIndex] === playerId && !state.finished;
  const isEliminated = state.eliminatedPlayers.includes(playerId);

  return (
    <div style={styles.container}>
      {Title}
      <div style={styles.topicBadge}>
        お題: <strong>{state.topic}</strong>
      </div>

      {/* Turn banner */}
      {!gameResult && (
        <div
          style={{
            ...styles.turnBanner,
            ...(isMyTurn
              ? {
                  background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                  color: "#fff",
                  animation: "ab-turnPulse 2s ease-in-out infinite",
                }
              : isEliminated
                ? { background: "#e2e8f0", color: C.textSub }
                : {}),
          }}
        >
          {isEliminated
            ? "あなたは脱落しました"
            : isMyTurn
              ? `あなたの番です${state.attackCount > 0 ? "（連続攻撃！）" : ""}`
              : `${currentPlayer?.name ?? "..."} の番です`}
        </div>
      )}

      {/* Attack result banner */}
      {state.lastAttackChar && !gameResult && (
        <div
          style={{
            ...styles.attackBanner,
            ...(state.lastAttackHit
              ? {
                  background: C.hitBg,
                  borderColor: C.hit,
                  color: C.hit,
                  animation: attackAnim === "hit" ? "ab-shake .5s ease-out" : undefined,
                }
              : {
                  background: "#f7f7f7",
                  borderColor: "#ccc",
                  color: C.textSub,
                  animation: attackAnim === "miss" ? "ab-missFade .5s ease-out" : undefined,
                }),
          }}
        >
          「{state.lastAttackChar}」→{" "}
          {state.lastAttackHit ? "ヒット！" : "ミス"}
        </div>
      )}

      {/* Result card */}
      {gameResult && (
        <GameResultCard
          result={gameResult.winnerId === playerId ? "win" : "lose"}
          winnerName={room.players.find((p) => p.id === gameResult.winnerId)?.name ?? "?"}
          isHost={playerId === room.hostId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      )}

      {/* 五十音ボード */}
      <div style={styles.kbCard}>
        <div style={styles.boardGrid}>
          {BOARD_LAYOUT.map((row, ri) => (
            <div key={ri} style={styles.boardRow}>
              {row.map((char, ci) => {
                if (!char) return <div key={ci} style={styles.charEmpty} />;
                const idx = charToIndex(char);
                const used = state.usedChars[idx];
                return (
                  <button
                    key={ci}
                    className={used ? "" : "ab-battle-char"}
                    style={{
                      ...styles.charButton,
                      ...(used
                        ? styles.charUsed
                        : {
                            cursor: isMyTurn ? "pointer" : "default",
                            borderColor: isMyTurn ? C.primary : "#aaa",
                          }),
                    }}
                    disabled={!isMyTurn || used || state.finished}
                    onClick={() =>
                      sendTypedMove({ type: "attack", charIndex: idx })
                    }
                  >
                    {used ? <s>{char}</s> : char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Player sheets */}
      <div style={styles.sheets}>
        {state.playerIds.map((pid, pi) => {
          const player = room.players.find((p) => p.id === pid);
          const word = state.words[pid];
          const rev = state.revealed[pid];
          const elim = state.eliminatedPlayers.includes(pid);
          const isMe = pid === playerId;
          const isCurrent = state.playerIds[state.currentPlayerIndex] === pid && !state.finished;
          const accentColor = PLAYER_COLORS[pi % PLAYER_COLORS.length];

          return (
            <div
              key={pid}
              style={{
                ...styles.sheet,
                borderLeft: `4px solid ${accentColor}`,
                ...(elim
                  ? { animation: "ab-eliminate .5s ease-out forwards" }
                  : {}),
                ...(isCurrent && !gameResult
                  ? { animation: "ab-glowPulse 2s ease-in-out infinite" }
                  : {}),
                ...(isMe && !elim
                  ? { background: "#f0f4ff" }
                  : {}),
              }}
            >
              <div style={styles.sheetName}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: elim ? C.textSub : accentColor,
                    marginRight: 6,
                  }}
                />
                {player?.name ?? "?"}{" "}
                {elim && (
                  <span style={{ color: C.textSub, fontWeight: 400 }}>（脱落）</span>
                )}
                {isCurrent && !gameResult && (
                  <span style={{ marginLeft: 4, fontSize: "0.75rem", color: C.primary }}>
                    ◀ ターン
                  </span>
                )}
              </div>
              <div style={styles.sheetCells}>
                {word?.map((c, i) => {
                  const revealed = rev?.[i];
                  const isNew = newlyRevealed.has(`${pid}-${i}`);
                  let bg: string = "#f5f5f5";
                  let borderClr: string = C.border;
                  if (isMe) {
                    bg = revealed ? C.hitBg : "#e8f0fe";
                    borderClr = revealed ? C.hit : C.primary;
                  } else if (revealed === "end") {
                    bg = c === "×" ? "#f5f5f5" : "#e8e8e8";
                    borderClr = c === "×" ? C.borderDark : "#bbb";
                  } else if (revealed) {
                    bg = c === "×" ? "#f5f5f5" : "#fffbe6";
                    borderClr = c === "×" ? C.borderDark : C.warning;
                  }
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.sheetCell,
                        background: bg,
                        borderColor: borderClr,
                        color: isMe && !revealed ? C.textSub : C.textMain,
                        ...(isNew
                          ? { animation: "ab-reveal .4s ease-out" }
                          : {}),
                      }}
                    >
                      {isMe ? c : revealed ? c : "?"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    fontFamily: FONT,
    padding: "1rem",
    background: C.bgMain,
    color: C.textMain,
  },
  subtitle: {
    color: C.textSub,
    margin: "0.5rem 0",
    textAlign: "center",
    fontSize: "0.95rem",
  },
  topicBadge: {
    fontSize: "1.05rem",
    margin: "0.25rem 0 0.5rem",
    padding: "0.4rem 1.2rem",
    borderRadius: "20px",
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  waiting: {
    color: C.textSub,
    fontStyle: "italic",
    fontSize: "1.1rem",
    marginTop: "2rem",
  },
  topicGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "center",
    maxWidth: "600px",
    margin: "1rem auto",
    maxHeight: "400px",
    overflowY: "auto",
    padding: "0.75rem",
    background: C.bgCard,
    borderRadius: "12px",
    border: `1px solid ${C.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
  },
  topicButton: {
    padding: "0.45rem 1rem",
    fontSize: "0.95rem",
    borderRadius: "20px",
    border: `1.5px solid ${C.border}`,
    background: C.bgCard,
    cursor: "pointer",
    fontFamily: FONT,
    color: C.textMain,
    animation: "ab-fadeIn .3s ease-out both",
  },
  customTopicRow: {
    display: "flex",
    gap: "0.5rem",
    margin: "1rem 0",
    justifyContent: "center",
  },
  input: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    borderRadius: "10px",
    border: `1.5px solid ${C.border}`,
    width: "200px",
    fontFamily: FONT,
    background: C.bgCard,
    color: C.textMain,
    transition: "border-color .2s, box-shadow .2s",
  },
  wordDisplay: {
    display: "flex",
    gap: "0.35rem",
    margin: "1rem 0 0.5rem",
    justifyContent: "center",
  },
  wordCell: {
    width: "42px",
    height: "42px",
    border: `2px solid ${C.borderDark}`,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: "bold",
    background: C.bgCard,
    transition: "border-color .2s, background .2s",
  },
  charCount: {
    color: C.textSub,
    fontSize: "0.85rem",
    margin: "0 0 0.5rem",
    textAlign: "center",
  },
  kbCard: {
    background: C.bgCard,
    borderRadius: "12px",
    border: `1px solid ${C.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
    padding: "0.75rem",
    margin: "0.5rem 0",
  },
  boardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  boardRow: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
  },
  charButton: {
    width: "44px",
    height: "44px",
    fontSize: "1.1rem",
    borderRadius: "8px",
    border: `1.5px solid ${C.border}`,
    background: C.bgCard,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    fontWeight: 500,
    color: C.textMain,
    boxShadow: "0 1px 2px rgba(0,0,0,.06)",
    position: "relative",
  },
  charEmpty: {
    width: "44px",
    height: "44px",
  },
  charUsed: {
    background: "#edf2f7",
    color: "#a0aec0",
    cursor: "default",
    borderColor: "transparent",
    boxShadow: "none",
    opacity: 0.5,
  },
  actionRow: {
    display: "flex",
    gap: "1rem",
    margin: "1rem 0",
    justifyContent: "center",
  },
  backspaceButton: {
    padding: "0.6rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "10px",
    border: "none",
    background: C.warning,
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: "0 2px 6px rgba(217,144,74,.3)",
  },
  submitButton: {
    padding: "0.6rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "10px",
    border: "none",
    background: C.primary,
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: `0 2px 6px rgba(74,111,165,.3)`,
  },
  turnBanner: {
    fontSize: "1.1rem",
    fontWeight: 700,
    margin: "0.25rem 0 0.5rem",
    padding: "0.6rem 1.5rem",
    borderRadius: "10px",
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    boxShadow: "0 2px 6px rgba(0,0,0,.06)",
    textAlign: "center",
    animation: "ab-fadeIn .3s ease-out",
  },
  attackBanner: {
    fontSize: "1.05rem",
    fontWeight: 700,
    margin: "0.25rem 0 0.5rem",
    padding: "0.5rem 1.2rem",
    borderRadius: "10px",
    border: "2px solid",
    textAlign: "center",
  },
  sheets: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "center",
    margin: "1rem 0",
  },
  sheet: {
    padding: "0.75rem 1rem",
    borderRadius: "12px",
    background: C.bgCard,
    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
    border: `1px solid ${C.border}`,
    transition: "box-shadow .3s, opacity .3s",
  },
  sheetName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    color: C.textMain,
  },
  sheetCells: {
    display: "flex",
    gap: "3px",
  },
  sheetCell: {
    width: "34px",
    height: "34px",
    border: `1.5px solid ${C.border}`,
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "background .3s, border-color .3s",
  },
  confirmOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  confirmCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "1.5rem 2rem",
    textAlign: "center" as const,
    boxShadow: "0 8px 32px rgba(0,0,0,.2)",
    minWidth: 260,
    fontFamily: FONT,
  },
  confirmTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: C.textMain,
  },
  confirmWord: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
    marginBottom: "1.25rem",
  },
  confirmChar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#e8f0fe",
    border: `2px solid ${C.primary}`,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: C.textMain,
  },
  confirmButtons: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
  },
  confirmCancel: {
    padding: "0.6rem 1.5rem",
    fontSize: "0.95rem",
    borderRadius: 10,
    border: "none",
    background: "#e2e8f0",
    color: C.textMain,
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
  },
  confirmSubmit: {
    padding: "0.6rem 1.5rem",
    fontSize: "0.95rem",
    borderRadius: 10,
    border: "none",
    background: C.primary,
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT,
    fontWeight: 600,
    boxShadow: `0 2px 8px ${C.primary}44`,
  },
};
