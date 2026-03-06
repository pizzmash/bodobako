interface AvatarProps {
  photoURL?: string;
  displayName: string;
  /** ピクセル単位のサイズ（デフォルト: 32） */
  size?: number;
}

const PersonIcon = ({ size }: { size: number }) => (
  <svg
    width={size * 0.6}
    height={size * 0.6}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
  </svg>
);

/**
 * ユーザーアバター。photoURL があれば画像を表示し、
 * なければイニシャル or PersonIcon にフォールバックする。
 */
export function Avatar({ photoURL, displayName, size = 32 }: AvatarProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border border-indigo-300/35 bg-white/90 flex items-center justify-center text-indigo-500 overflow-hidden shrink-0"
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <PersonIcon size={size} />
      )}
    </div>
  );
}
