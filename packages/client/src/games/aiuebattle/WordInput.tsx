import type { AiueBattleState, AiueBattleMove } from "@bodobako/shared";
import { WORD_LENGTH } from "@bodobako/shared";
import { C, BOARD_LAYOUT, styles } from "./constants";
import { ConfirmModal } from "./ConfirmModal";

interface WordInputProps {
  state: AiueBattleState;
  playerId: string;
  sendTypedMove: (move: AiueBattleMove) => void;
  wordChars: string[];
  setWordChars: (chars: string[]) => void;
  showWordConfirm: boolean;
  setShowWordConfirm: (show: boolean) => void;
}

export function WordInput({
  state,
  playerId,
  sendTypedMove,
  wordChars,
  setWordChars,
  showWordConfirm,
  setShowWordConfirm,
}: WordInputProps) {
  const hasSubmitted = state.submittedPlayers.includes(playerId);

  if (hasSubmitted) {
    return (
      <div style={{ animation: "ab-fadeIn .4s ease-out", textAlign: "center" as const }}>
        <p style={styles.waiting}>
          <span style={{ animation: "ab-pulse 1.5s ease-in-out infinite", display: "inline-block" }}>
            他のプレイヤーを待っています... ({state.submittedPlayers.length}/
            {state.playerIds.length})
          </span>
        </p>
      </div>
    );
  }

  return (
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
