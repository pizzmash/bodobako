import { WORD_LENGTH } from "@bodobako/shared";
import { Z } from "../../styles/tokens";
import { C, styles } from "./constants";

interface ConfirmModalProps {
  wordChars: string[];
  onCancel: () => void;
  onSubmit: () => void;
}

export function ConfirmModal({ wordChars, onCancel, onSubmit }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: Z.gameModal, paddingRight: "var(--sidebar-right-offset, 0px)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 text-center shadow-2xl max-w-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.confirmTitle}>この回答でよろしいですか？</div>
        <div style={styles.confirmWord}>
          {Array.from({ length: WORD_LENGTH }, (_, i) => {
            const c = wordChars[i] ?? "×";
            const isFiller = i >= wordChars.length;
            return (
              <span key={`char-${i}`} style={{
                ...styles.confirmChar,
                ...(isFiller ? { 
                  background: C.gray100, 
                  borderColor: C.gray300, 
                  color: C.textSub 
                } : {}),
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
