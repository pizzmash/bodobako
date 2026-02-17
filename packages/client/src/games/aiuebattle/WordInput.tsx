import type { AiueBattleMove, AiueBattleState, RoomInfo } from "@bodobako/shared";
import { WORD_LENGTH } from "@bodobako/shared";
import { ConfirmModal } from "./ConfirmModal";
import { 
  BOARD_LAYOUT, 
  BOARD_LAYOUT_HORIZONTAL, 
  C, 
  FONT, 
  styles, 
  useIsWideBoard,
  topicCardStyle,
  topicBadgeStyle,
  topicTextStyle,
  SPACING,
  RADIUS,
  SHADOWS,
} from "./constants";

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
      <div style={{ 
        animation: "ab-fadeIn .4s ease-out", 
        textAlign: "center" as const,
        width: "100%",
        maxWidth: "400px",
      }}>
        <p style={styles.waiting}>
          <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite", display: "inline-block" }}>
            他のプレイヤーを待っています... ({state.submittedPlayers.length}/
            {state.playerIds.length})
          </span>
        </p>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: SPACING.md,
          margin: `${SPACING.xl} auto`,
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
                  padding: SPACING.md,
                  borderRadius: RADIUS.md,
                  background: done ? C.primaryLight : C.bgCard,
                  border: `2px solid ${done ? C.primary : C.border}`,
                  fontFamily: FONT,
                }}
              >
                <span style={{ 
                  color: C.textMain, 
                  fontWeight: pid === playerId ? 600 : 400 
                }}>
                  {name}{pid === playerId ? "（あなた）" : ""}
                </span>
                <span style={{
                  fontWeight: 600,
                  color: done ? C.textMain : C.textSub,
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
    <div style={{ 
      animation: "ab-fadeIn .4s ease-out",
      width: "100%",
      maxWidth: "700px",
    }}>
      {/* お題カード - 共通スタイルを使用 */}
      <div style={topicCardStyle}>
        <div style={topicBadgeStyle}>Topic</div>
        <p style={topicTextStyle}>{state.topic}</p>
      </div>
      
      <p style={styles.subtitle}>
        2〜7文字の言葉を入力してください（濁点なし・大文字で）
      </p>

      <div style={styles.wordDisplay}>
        {Array.from({ length: WORD_LENGTH }, (_, i) => (
          <div
            key={i}
            style={{
              width: "clamp(38px, 10vw, 52px)",
              height: "clamp(38px, 10vw, 52px)",
              minWidth: "38px",
              minHeight: "38px",
              border: wordChars[i] ? "none" : `2px dashed ${C.border}`,
              borderRadius: RADIUS.md,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
              fontWeight: 900,
              background: wordChars[i] ? C.bgCard : "transparent",
              transition: "all .2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: wordChars[i] ? SHADOWS.sm : "none",
              flexShrink: 0,
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
                      background: isDisabled ? C.gray200 : C.bgCard,
                      color: C.textMain,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
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
