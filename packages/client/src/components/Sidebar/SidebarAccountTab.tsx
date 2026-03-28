import { Camera, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../lib/socket";
import { MAX_APP_DISPLAY_NAME_LENGTH } from "../../lib/constants";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { CardStyleSection } from "./CardStyleSection";

async function cropAndResizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 128, 128);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました"))),
      "image/jpeg",
      0.85,
    );
  });
}

interface SidebarAccountTabProps {
  isOpen: boolean;
}

export function SidebarAccountTab({ isOpen }: SidebarAccountTabProps) {
  const { firebaseUser, appDisplayName, friendCode, profilePhotoURL, updateDisplayName, updateAvatar, deleteAvatar, signOut, cardStyle, updateCardStyle } = useAuth();
  const [nameDraft, setNameDraft] = useState(appDisplayName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCustomAvatar = profilePhotoURL !== null && profilePhotoURL.startsWith(API_BASE);

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

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

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
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploadError(null);
              setIsUploading(true);
              cropAndResizeAvatar(file)
                .then((blob) => updateAvatar(new File([blob], "avatar.jpg", { type: "image/jpeg" })))
                .catch((err) => setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました"))
                .finally(() => setIsUploading(false));
            }}
            aria-label="アバター画像をアップロード"
          />

          {/* アバターボタン + ドロップダウンメニュー */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              className="relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              onClick={() => !isUploading && setShowMenu((v) => !v)}
              disabled={isUploading}
              aria-label="アバター画像を変更"
              aria-haspopup="true"
              aria-expanded={showMenu}
            >
              <Avatar
                photoURL={profilePhotoURL ?? firebaseUser.photoURL ?? ""}
                displayName={firebaseUser.displayName ?? firebaseUser.email ?? "?"}
                size={48}
              />
              <span
                className="absolute -bottom-[5px] -right-[5px] flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 ring-2 ring-white shadow-sm"
                aria-hidden="true"
              >
                {isUploading
                  ? <Spinner size={10} colorClass="border-white/40 border-t-white" />
                  : <Camera size={11} strokeWidth={2.5} className="text-white" />
                }
              </span>
            </button>

            {showMenu && (
              <div
                className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[168px] rounded-xl border border-indigo-100/60 bg-white py-1 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.88rem] font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none"
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Camera size={14} strokeWidth={2} className="shrink-0" />
                  写真を変更
                </button>
                {hasCustomAvatar && (
                  <>
                    <div className="mx-2 my-1 h-px bg-indigo-100/60" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.88rem] font-medium text-red-500 hover:bg-red-50/60 focus-visible:bg-red-50/60 focus-visible:outline-none"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        setUploadError(null);
                        setIsUploading(true);
                        deleteAvatar()
                          .catch((err) => setUploadError(err instanceof Error ? err.message : "削除に失敗しました"))
                          .finally(() => setIsUploading(false));
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2} className="shrink-0" />
                      デフォルトに戻す
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-[0.8rem] text-red-500 mt-1.5 mb-0" role="alert">{uploadError}</p>
          )}
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
          className="w-full rounded-xl border border-indigo-200/50 bg-indigo-50/40 px-3.5 py-2.5 font-poppins text-[0.95rem] font-medium text-indigo-600 outline-none transition duration-150 focus:border-indigo-500 focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
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
          className="mt-3 min-h-[44px] w-full rounded-xl border-0 bg-indigo-500 py-2.5 font-poppins text-[0.9rem] font-semibold text-white transition duration-200 hover:-translate-y-px hover:bg-indigo-600 hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div className="h-px bg-indigo-100/30 mx-5" />

      <CardStyleSection
        appDisplayName={appDisplayName}
        currentCardStyle={cardStyle}
        onSave={updateCardStyle}
        photoURL={profilePhotoURL ?? firebaseUser?.photoURL ?? undefined}
      />

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
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-indigo-400 transition duration-150 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.92]"
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
          className="min-h-[44px] w-full rounded-xl border border-red-200/50 bg-transparent py-2.5 font-poppins text-[0.9rem] font-semibold text-red-500 transition duration-200 hover:border-red-500 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
              className="block h-[38px] w-auto"
            />
          </a>
        </div>
      )}
    </>
  );
}
