import { WORD_LENGTH } from "@bodobako/shared";
import { C, styles } from "./constants";

interface ConfirmModalProps {
  wordChars: string[];
  onCancel: () => void;
  onSubmit: () => void;
}

export function ConfirmModal({ wordChars, onCancel, onSubmit }: ConfirmModalProps) {
  return (
    <div style={styles.confirmOverlay} onClick={onCancel}>
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
            onClick={onCancel}
          >
            戻る
          </button>
          <button
            className="ab-action-btn"
            style={styles.confirmSubmit}
            onClick={onSubmit}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
}
