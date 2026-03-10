import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { MAX_PLAYER_NAME_LENGTH } from "../lib/constants";
import { Spinner } from "./ui/Spinner";

export function NameEntryModal() {
  const { setPlayerName } = useRoom();
  const { firebaseUser, isAuthLoading, isProfileLoading, signInWithGoogle } = useAuth();
  const [draft, setDraft] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
    <div className="fixed inset-0 z-modal bg-indigo-600/15 backdrop-blur-2xl animate-fade-in">
      <div
        className="absolute left-1/2 top-1/2 flex w-[380px] max-w-[calc(100%-48px)] flex-col items-center gap-2 rounded-3xl border-2 border-indigo-300/20 bg-white/95 px-10 pb-9 pt-12 text-[#312E81] shadow-modal-indigo backdrop-blur-xl animate-modal-appear"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8 min-h-[80px]" aria-live="polite" aria-label="読み込み中">
            <Spinner size={32} />
          </div>
        ) : (
          <>
            {/* SVGアイコン */}
            <div className="mb-2 drop-shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div
              className="text-2xl font-bold font-poppins mt-1 text-indigo-gradient"
            >
              ボド箱へようこそ！
            </div>
            <div className="text-sm text-indigo-400 mb-4 font-medium">
              プレイヤー名を入力してください
            </div>

            <input
              ref={inputRef}
              className={`w-full rounded-2xl border-2 border-indigo-300/30 bg-white/70 px-[18px] py-[14px] text-center font-poppins text-[1.05rem] font-medium text-indigo-600 outline-none transition-all duration-200 backdrop-blur-lg focus:border-indigo-500 focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1),0_4px_12px_rgba(99,102,241,0.15)] ${shake ? "animate-shake border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15),0_4px_12px_rgba(239,68,68,0.2)]" : ""}`}
              placeholder="名前を入力..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_PLAYER_NAME_LENGTH}
              aria-label="プレイヤー名入力"
              type="text"
            />

            <button
              className="mt-3 min-h-[52px] w-full cursor-pointer rounded-2xl border-0 bg-indigo-gradient py-[14px] font-poppins text-[1.05rem] font-semibold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3),0_0_0_1px_rgba(255,255,255,0.2)_inset] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-gradient-deep hover:shadow-[0_8px_24px_rgba(99,102,241,0.4),0_0_0_1px_rgba(129,140,248,0.5)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!draft.trim()}
              aria-label="ゲームを始める"
            >
              はじめる
            </button>

            {!firebaseUser && (
              <>
                <div className="w-full flex items-center gap-3 my-2" aria-hidden="true">
                  <div className="flex-1 h-px bg-indigo-300/20" />
                  <span className="text-[0.78rem] text-violet-400 font-medium whitespace-nowrap">または</span>
                  <div className="flex-1 h-px bg-indigo-300/20" />
                </div>

                <button
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-indigo-300/30 bg-[rgba(238,242,255,0.6)] py-3 font-poppins text-[0.95rem] font-semibold text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.08)] transition duration-200 hover:-translate-y-px hover:bg-indigo-gradient-deep hover:text-white hover:shadow-[0_6px_20px_rgba(99,102,241,0.35)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-0"
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
