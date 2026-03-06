import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { SidebarAccountTab } from "./Sidebar/SidebarAccountTab";
import { SidebarFriendsTab } from "./Sidebar/SidebarFriendsTab";
import { useFriendsData } from "./Sidebar/hooks/useFriendsData";
import { Spinner } from "./ui/Spinner";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    firebaseUser,
    idToken,
    isAuthLoading,
    isProfileLoading,
    signInWithGoogle,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"account" | "friends">("account");
  const friendsData = useFriendsData(idToken);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLoading = isAuthLoading || isProfileLoading;

  return (
    <>
      {/* Overlay */}
      <div
        className="sidebar-overlay fixed inset-0 bg-[rgba(15,10,40,0.45)] backdrop-blur-sm z-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="sidebar-drawer fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] bg-[rgba(255,255,255,0.97)] backdrop-blur-xl border-l border-indigo-200/25 shadow-[-8px_0_40px_rgba(99,102,241,0.15)] z-sidebar flex flex-col font-poppins animate-slide-in-right"
        role="dialog"
        aria-label="アカウントメニュー"
      >
        {/* ドロワーヘッダー */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-indigo-100/20">
          <span className="text-[1.05rem] font-bold text-indigo-gradient">メニュー</span>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full border-0 bg-indigo-100/40 text-indigo-500 cursor-pointer p-0 hover:bg-indigo-100/70 transition-colors"
            onClick={onClose}
            aria-label="メニューを閉じる"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* メインタブバー */}
        {!isLoading && firebaseUser && (
          <div className="flex gap-1 bg-indigo-50/70 rounded-xl p-1 mx-4 mt-3">
            {(["account", "friends"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  className={`sidebar-main-tab flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-0 text-[0.85rem] font-poppins ${
                    active
                      ? "bg-white text-indigo-600 font-bold shadow-[0_2px_8px_rgba(99,102,241,0.15)]"
                      : "bg-transparent text-slate-400 font-medium"
                  }`}
                  onClick={() => setActiveTab(tab)}
                  aria-selected={active}
                  role="tab"
                >
                  {tab === "account" ? (
                    <>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
                      </svg>
                      アカウント
                    </>
                  ) : (
                    <>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <circle cx="9" cy="8" r="3" />
                        <path d="M2 20c0-3.3 3-6 7-6" />
                        <circle cx="17" cy="10" r="3" />
                        <path d="M13.5 20c0-3 2.7-5.5 6.5-5.5" />
                      </svg>
                      フレンド
                      {friendsData.mutualFriends.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-indigo-100/80 text-indigo-600 text-[0.7rem] font-bold px-1">
                          {friendsData.mutualFriends.length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ボディ */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center px-5 py-12 gap-3"
              aria-live="polite"
            >
              <Spinner size={32} />
              <span className="text-[0.85rem] text-indigo-400 font-medium">読み込み中...</span>
            </div>
          ) : !firebaseUser ? (
            /* 未ログイン */
            <div className="px-5 py-3.5">
              <div className="flex justify-center mb-3" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#818CF8" strokeWidth="1.5" />
                  <path
                    d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
                    stroke="#818CF8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[0.85rem] text-indigo-400 text-center mb-5 leading-[1.6]">
                ログインするとプロフィールとフレンド機能が使えます
              </p>
              <button
                className="sidebar-sign-in-btn w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border-0 text-white text-[0.95rem] font-semibold font-poppins shadow-[0_4px_12px_rgba(99,102,241,0.3)] min-h-[48px] bg-indigo-gradient"
                onClick={signInWithGoogle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Googleでサインイン
              </button>
            </div>
          ) : activeTab === "account" ? (
            <SidebarAccountTab isOpen={isOpen} />
          ) : (
            <SidebarFriendsTab
              isActive={isOpen && activeTab === "friends"}
              friendsData={friendsData}
            />
          )}
        </div>
      </aside>
    </>
  );
}

