interface MeepleProps {
  color: string;
  size?: number;
  falling?: boolean;
  className?: string;
}

export function Meeple({ color, size = 32, falling, className = "" }: MeepleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`${falling ? "ciao-fall" : ""} ${className}`}
      style={{ fill: color }}
    >
      {/* 頭 */}
      <circle cx="16" cy="8" r="5.5" />
      <circle cx="16" cy="8" r="5.5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
      {/* 体（台形） */}
      <path d="M9 28 L11 15 L21 15 L23 28 Z" rx="2" />
      <path d="M9 28 L11 15 L21 15 L23 28 Z" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}
