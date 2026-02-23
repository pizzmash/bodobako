import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
@keyframes name-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .name-entry-btn, .name-entry-icon, .name-google-btn {
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

.name-google-btn {
  transition: all .2s ease;
  cursor: pointer;
}
.name-google-btn:hover {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35) !important;
}
.name-google-btn:active {
  transform: translateY(0);
}
.name-google-btn:focus {
  outline: 3px solid #6366F1;
  outline-offset: 2px;
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
  const { firebaseUser, isAuthLoading, isProfileLoading, signInWithGoogle } = useAuth();
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

  const isLoading = isAuthLoading || isProfileLoading;

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        {isLoading ? (
          /* ローディング中はスピナーのみ表示 */
          <div style={styles.spinnerWrapper} aria-live="polite" aria-label="読み込み中">
            <div style={styles.spinner} aria-hidden="true" />
          </div>
        ) : (
          <>
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

            {/* 未ログイン時: Google サインインオプション */}
            {!firebaseUser && (
              <>
                <div style={styles.dividerWrapper} aria-hidden="true">
                  <div style={styles.dividerLine} />
                  <span style={styles.dividerText}>または</span>
                  <div style={styles.dividerLine} />
                </div>

                <button
                  className="name-google-btn"
                  style={styles.googleButton}
                  onClick={signInWithGoogle}
                  aria-label="Googleアカウントでサインイン"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Googleでサインイン
                </button>
              </>
            )}
          </>
        )}
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

  /* スピナー */
  spinnerWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 0",
    minHeight: 80,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(99, 102, 241, 0.2)",
    borderTop: "3px solid #6366F1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
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

  /* 区切り線 */
  dividerWrapper: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "8px 0 4px",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(129, 140, 248, 0.2)",
  },
  dividerText: {
    fontSize: "0.78rem",
    color: "#A78BFA",
    fontWeight: 500,
    whiteSpace: "nowrap",
    fontFamily: BODY_FONT,
  },

  /* Google サインインボタン */
  googleButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px 0",
    borderRadius: 14,
    border: "1.5px solid rgba(129, 140, 248, 0.3)",
    background: "rgba(238, 242, 255, 0.6)",
    color: "#4F46E5",
    fontSize: "0.95rem",
    fontWeight: 600,
    fontFamily: FONT,
    minHeight: 48,
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.08)",
  },
};
