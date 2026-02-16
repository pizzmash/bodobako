import type { AiueBattleMove, AiueBattleState, RoomInfo } from "@bodobako/shared";
import { WORD_LENGTH } from "@bodobako/shared";
import { ConfirmModal } from "./ConfirmModal";
import { BOARD_LAYOUT, BOARD_LAYOUT_HORIZONTAL, C, FONT, styles, useIsWideBoard } from "./constants";

interface WordInputProps {
  state: AiueBattleState;
  playerId: string;
  room: RoomInfo;
  sendTypedMove: (move: AiueBattleMove) => void;
  wordChars: string[];
  setWordChars: (chars: string[]) => void;
  showWordConfirm: boolean;
  setShowWordConfirm: (show: boolean) => void;
}

export function WordInput({
  state,
  playerId,
  room,
  sendTypedMove,
  wordChars,
  setWordChars,
  showWordConfirm,
  setShowWordConfirm,
}: WordInputProps) {
  const hasSubmitted = state.submittedPlayers.includes(playerId);
  const isWide = useIsWideBoard();
  const layout = isWide ? BOARD_LAYOUT_HORIZONTAL : BOARD_LAYOUT;

  if (hasSubmitted) {
    return (
      <div style={{ animation: "ab-fadeIn .4s ease-out", textAlign: "center" as const }}>
        <p style={styles.waiting}>
          <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite", display: "inline-block" }}>
            他のプレイヤーを待っています... ({state.submittedPlayers.length}/
            {state.playerIds.length})
          </span>
        </p>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          margin: "1rem auto",
          maxWidth: 280,
        }}>
          {state.playerIds.map((pid) => {
            const name = room.players.find((p) => p.id === pid)?.name ?? "?";
            const done = state.submittedPlayers.includes(pid);
            return (
              <div
                key={pid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "8px",
                  background: done ? "#f0faf0" : C.bgCard,
                  border: `1px solid ${done ? C.success : C.border}`,
                  fontFamily: FONT,
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ color: C.textMain, fontWeight: pid === playerId ? 600 : 400 }}>
                  {name}{pid === playerId ? "（あなた）" : ""}
                </span>
                <span style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: done ? C.success : C.textSub,
                }}>
                  {done ? "決定済み" : "入力中..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "ab-fadeIn .4s ease-out" }}>
      {/* お題カード */}
      <div
        style={{
          background: "linear-gradient(145deg, #ffffff, #fafafa)",
          padding: "clamp(0.75rem, 3vw, 1.5rem)",
          borderRadius: "clamp(12px, 3vw, 20px)",
          border: "none",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          textAlign: "center",
          margin: "0 auto 1.5rem",
          maxWidth: "600px",
        }}
      >
        <div
          style={{
            fontSize: "clamp(0.5rem, 1.5vw, 0.65rem)",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#fff",
            background: "linear-gradient(135deg, #f4d125, #ffbc42)",
            padding: "clamp(0.25rem, 1vw, 0.4rem) clamp(0.5rem, 2vw, 1rem)",
            borderRadius: "clamp(12px, 3vw, 20px)",
            display: "inline-block",
            marginBottom: "clamp(0.35rem, 1.5vw, 0.75rem)",
            boxShadow: "0 2px 8px rgba(244,209,37,0.3)",
          }}
        >
          Topic
        </div>
        <p style={{ 
          fontSize: state.topic.length > 20 
            ? "clamp(0.9rem, 3vw, 1.3rem)" 
            : state.topic.length > 12 
              ? "clamp(1rem, 3.5vw, 1.6rem)" 
              : "clamp(1.2rem, 4vw, 2rem)", 
          fontWeight: 900, 
          color: C.textMain, 
          margin: 0, 
          letterSpacing: "0.02em", 
          wordBreak: "break-word", 
          lineHeight: "1.2" 
        }}>
          {state.topic}
        </p>
      </div>
      
      <p style={styles.subtitle}>
        2〜7文字の言葉を入力してください（濁点なし・大文字で）
      </p>

      <div style={styles.wordDisplay}>
        {Array.from({ length: WORD_LENGTH }, (_, i) => (
          <div
            key={i}
            style={{
              width: "52px",
              height: "52px",
              border: wordChars[i] ? "none" : "2px dashed rgba(0,0,0,0.15)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 900,
              background: wordChars[i] 
                ? "linear-gradient(145deg, #ffffff, #f5f5f5)" 
                : "transparent",
              transition: "all .25s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: wordChars[i] 
                ? "0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)" 
                : "none",
              ...(wordChars[i]
                ? {
                    animation: "ab-charPop .3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }
                : {}),
            }}
          >
            {wordChars[i] ?? ""}
          </div>
        ))}
      </div>
      <p style={styles.charCount}>{wordChars.length} / {WORD_LENGTH} 文字</p>

      <div style={styles.kbCard}>
        <div style={isWide ? styles.boardGridH : styles.boardGrid}>
          {layout.map((row, ri) => (
            <div key={ri} style={isWide ? styles.boardRowH : styles.boardRow}>
              {row.map((char, ci) => {
                if (!char) return <div key={ci} style={isWide ? styles.charEmptyH : styles.charEmpty} />;
                
                const isDisabled = wordChars.length >= WORD_LENGTH;
                
                return (
                  <button
                    key={ci}
                    className="ab-char-btn"
                    style={{
                      ...(isWide ? styles.charButtonH : styles.charButton),
                      background: isDisabled ? "#e5e7eb" : "#fff",
                      color: C.textMain,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                    disabled={isDisabled}
                    onClick={() => setWordChars([...wordChars, char])}
                  >
                    {char}
                  </button>
                );
              })}
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
          確認
        </button>
      </div>

      {showWordConfirm && (
        <ConfirmModal
          wordChars={wordChars}
          onCancel={() => setShowWordConfirm(false)}
          onSubmit={() => {
            sendTypedMove({ type: "submit-word", word: wordChars });
            setWordChars([]);
            setShowWordConfirm(false);
          }}
        />
      )}
    </div>
  );
}
