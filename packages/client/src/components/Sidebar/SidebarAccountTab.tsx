import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { MAX_APP_DISPLAY_NAME_LENGTH } from "../../lib/constants";
import { Avatar } from "../ui/Avatar";

interface SidebarAccountTabProps {
  isOpen: boolean;
}

export function SidebarAccountTab({ isOpen }: SidebarAccountTabProps) {
  const { firebaseUser, appDisplayName, friendCode, updateDisplayName, signOut } = useAuth();
  const [nameDraft, setNameDraft] = useState(appDisplayName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = nameDraft.trim() !== "" && nameDraft.trim() !== appDisplayName;

  useEffect(() => {
    if (appDisplayName !== null) setNameDraft(appDisplayName);
  }, [appDisplayName]);

  useEffect(() => {
    if (isOpen && firebaseUser && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, firebaseUser]);

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
    } catch {
      const el = document.createElement("textarea");
      el.value = friendCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === appDisplayName) return;
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await updateDisplayName(trimmed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (!firebaseUser) return null;

  return (
    <>
      <div className="px-5 py-3.5">
        <div className="flex items-center gap-3.5">
          <Avatar
            photoURL={firebaseUser.photoURL ?? ""}
            displayName={firebaseUser.displayName ?? firebaseUser.email ?? "?"}
            size={48}
          />
          <div className="min-w-0">
            <div className="text-[0.95rem] font-semibold text-indigo-900 truncate">
              {firebaseUser.displayName}
            </div>
            <div className="text-[0.78rem] text-indigo-400 mt-0.5 truncate">
              {firebaseUser.email}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-indigo-100/30 mx-5" />

      <div className="px-5 py-3.5">
        <label
          className="block text-[0.75rem] font-semibold text-indigo-500 uppercase tracking-[0.08em] mb-2"
          htmlFor="sidebar-display-name"
        >
          アプリ表示名
        </label>
        <input
          id="sidebar-display-name"
          ref={inputRef}
          className="sidebar-name-input w-full px-3.5 py-2.5 text-[0.95rem] rounded-xl border border-indigo-200/50 outline-none box-border font-poppins text-indigo-600 font-medium bg-indigo-50/40"
          value={nameDraft}
          onChange={(e) => {
            setNameDraft(e.target.value);
            setSaveError(null);
            setSaveSuccess(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
          maxLength={MAX_APP_DISPLAY_NAME_LENGTH}
          placeholder="表示名を入力..."
          type="text"
        />
        {saveError && (
          <p className="text-[0.8rem] text-red-500 mt-1.5 mb-0" role="alert">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="text-[0.8rem] text-green-500 font-medium mt-1.5 mb-0" role="status">
            保存しました
          </p>
        )}
        <button
          className="sidebar-save-btn w-full py-2.5 rounded-xl border-0 bg-indigo-500 text-white text-[0.9rem] font-semibold font-poppins mt-3 min-h-[44px]"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div className="h-px bg-indigo-100/30 mx-5" />

      {friendCode && (
        <div className="px-5 py-3.5">
          <div className="text-[0.75rem] font-semibold text-indigo-500 uppercase tracking-[0.08em] mb-2">
            フレンドコード
          </div>
          <div className="flex items-center gap-2 mt-1.5 bg-indigo-50/60 border border-indigo-200/40 rounded-xl px-3 py-2">
            <span
              className="flex-1 font-mono text-[1.05rem] font-bold text-indigo-600 tracking-[0.12em] select-all"
              aria-label={`フレンドコード: ${friendCode}`}
            >
              {friendCode.slice(0, 4)}-{friendCode.slice(4)}
            </span>
            <button
              className="sidebar-copy-btn flex items-center justify-center w-[30px] h-[30px] rounded-md border-0 bg-transparent text-indigo-400 p-0 shrink-0"
              onClick={() => void handleCopy()}
              aria-label={copied ? "コピーしました" : "フレンドコードをコピー"}
            >
              {copied ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[0.78rem] text-green-500 font-medium mt-1.5 mb-0" role="status">
              クリップボードにコピーしました
            </p>
          )}
        </div>
      )}

      <div className="h-px bg-indigo-100/30 mx-5" />

      <div className="px-5 py-3.5">
        <button
          className="sidebar-sign-out-btn w-full py-2.5 rounded-xl border border-red-200/50 bg-transparent text-red-500 text-[0.9rem] font-semibold font-poppins min-h-[44px]"
          onClick={signOut}
        >
          サインアウト
        </button>
      </div>

      {import.meta.env.VITE_BMC_USERNAME && (
        <div className="px-5 pb-3.5 flex justify-center">
          <a
            href={`https://www.buymeacoffee.com/${import.meta.env.VITE_BMC_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="開発者にコーヒーを贈る"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              style={{ height: 38, width: "auto", display: "block" }}
            />
          </a>
        </div>
      )}
    </>
  );
}
