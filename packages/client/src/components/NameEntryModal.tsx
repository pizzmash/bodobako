import { useState, useEffect, useRef } from "react";
import { useRoom } from "../context/RoomContext";

const FONT = "'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const INJECTED_STYLES = `
@keyframes name-backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes name-cardIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(.9) translateY(20px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
}
.name-entry-btn {
  transition: filter .15s ease, transform .1s ease;
}
.name-entry-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.name-entry-btn:active:not(:disabled) {
  transform: translateY(0);
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
        <div style={styles.icon}>🎲</div>
        <div style={styles.title}>ボド箱へようこそ！</div>
        <div style={styles.subtitle}>プレイヤー名を入力してください</div>

        <input
          ref={inputRef}
          style={{
            ...styles.input,
            ...(shake ? styles.inputShake : {}),
          }}
          placeholder="名前を入力..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={12}
        />

        <button
          className="name-entry-btn"
          style={{
            ...styles.button,
            opacity: draft.trim() ? 1 : 0.5,
          }}
          onClick={handleSubmit}
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
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 950,
    animation: "name-backdropIn .3s ease",
  },
  card: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px 32px",
    width: 340,
    maxWidth: "calc(100% - 48px)",
    boxSizing: "border-box",
    boxShadow: "0 24px 64px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    fontFamily: FONT,
    color: "#2d3748",
    animation: "name-cardIn .45s ease both",
  },
  icon: {
    fontSize: "2.8rem",
    lineHeight: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: "1.35rem",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: "0.88rem",
    color: "#718096",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "1.05rem",
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    fontFamily: FONT,
    transition: "border-color .2s, box-shadow .2s",
  },
  inputShake: {
    borderColor: "#e05555",
    boxShadow: "0 0 0 3px rgba(224, 85, 85, 0.2)",
    animation: "name-shake .4s ease",
  },
  button: {
    width: "100%",
    padding: "12px 0",
    fontSize: "1rem",
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #4a6fa5, #5b83bd)",
    color: "#fff",
    cursor: "pointer",
    marginTop: 8,
    fontFamily: FONT,
  },
};
