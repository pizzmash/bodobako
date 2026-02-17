import { useState, useEffect, useRef } from "react";
import { useRoom } from "../context/RoomContext";

const FONT = "'Poppins', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
const BODY_FONT = "'Inter', 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const INJECTED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap');

@keyframes name-backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes name-cardIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(.9) translateY(20px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
}
@keyframes name-iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .name-entry-btn, .name-entry-icon {
    animation: none !important;
    transition: none !important;
  }
}

.name-entry-btn {
  transition: all .2s ease;
}
.name-entry-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%) !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.5);
}
.name-entry-btn:active:not(:disabled) {
  transform: translateY(0);
}
.name-entry-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.name-entry-input:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
  border-color: #6366F1 !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 4px 12px rgba(99, 102, 241, 0.15) !important;
}

.name-entry-icon {
  animation: name-iconPulse 3s ease-in-out infinite;
}

@keyframes name-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
`;

function useInjectStyles() {
  useEffect(() => {
    const id = "name-entry-styles";
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

export function NameEntryModal() {
  useInjectStyles();
  const { setPlayerName } = useRoom();
  const [draft, setDraft] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // auto-focus after mount animation
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    if (!draft.trim()) {
      setShake(true);
      inputRef.current?.focus();
      setTimeout(() => setShake(false), 400);
      return;
    }
    setPlayerName(draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        {/* SVGアイコン */}
        <div className="name-entry-icon" style={styles.iconWrapper}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div style={styles.title}>ボド箱へようこそ！</div>
        <div style={styles.subtitle}>プレイヤー名を入力してください</div>

        <input
          ref={inputRef}
          className="name-entry-input"
          style={{
            ...styles.input,
            ...(shake ? styles.inputShake : {}),
          }}
          placeholder="名前を入力..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={12}
          aria-label="プレイヤー名入力"
          type="text"
        />

        <button
          className="name-entry-btn"
          style={{
            ...styles.button,
            opacity: draft.trim() ? 1 : 0.5,
          }}
          onClick={handleSubmit}
          disabled={!draft.trim()}
          aria-label="ゲームを始める"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(79, 70, 229, 0.15)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    zIndex: 950,
    animation: "name-backdropIn .3s ease",
  },
  card: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: 24,
    padding: "48px 40px 36px",
    width: 380,
    maxWidth: "calc(100% - 48px)",
    boxSizing: "border-box",
    boxShadow: "0 24px 64px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(129, 140, 248, 0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontFamily: BODY_FONT,
    color: "#312E81",
    animation: "name-cardIn .45s ease both",
    border: "2px solid rgba(129, 140, 248, 0.2)",
  },
  iconWrapper: {
    marginBottom: 8,
    filter: "drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3))",
  },
  icon: {
    fontSize: "2.8rem",
    lineHeight: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontFamily: FONT,
    background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginTop: 4,
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#818CF8",
    marginBottom: 16,
    fontWeight: 500,
    fontFamily: BODY_FONT,
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    fontSize: "1.05rem",
    borderRadius: 14,
    border: "2px solid rgba(129, 140, 248, 0.3)",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    fontFamily: FONT,
    transition: "all .2s ease",
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(8px)",
    color: "#4F46E5",
    fontWeight: 500,
  },
  inputShake: {
    borderColor: "#EF4444",
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.15), 0 4px 12px rgba(239, 68, 68, 0.2)",
    animation: "name-shake .4s ease",
  },
  button: {
    width: "100%",
    padding: "14px 0",
    fontSize: "1.05rem",
    fontWeight: 600,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    color: "#fff",
    cursor: "pointer",
    marginTop: 12,
    fontFamily: FONT,
    minHeight: 52,
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
  },
};
