import type { AiueBattleState, AiueBattleMove, RoomInfo } from "@bodobako/shared";
import { WORD_LENGTH } from "@bodobako/shared";
import { C, BOARD_LAYOUT, BOARD_LAYOUT_HORIZONTAL, useIsWideBoard, FONT, styles } from "./constants";
import { ConfirmModal } from "./ConfirmModal";

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
        <div style={isWide ? styles.boardGridH : styles.boardGrid}>
          {layout.map((row, ri) => (
            <div key={ri} style={isWide ? styles.boardRowH : styles.boardRow}>
              {row.map((char, ci) =>
                char ? (
                  <button
                    key={ci}
                    className="ab-char-btn"
                    style={isWide ? styles.charButtonH : styles.charButton}
                    disabled={wordChars.length >= WORD_LENGTH}
                    onClick={() => setWordChars([...wordChars, char])}
                  >
                    {char}
                  </button>
                ) : (
                  <div key={ci} style={isWide ? styles.charEmptyH : styles.charEmpty} />
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
