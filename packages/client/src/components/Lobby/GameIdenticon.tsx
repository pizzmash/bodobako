import type { CSSProperties } from "react";

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function GameIdenticon({ gameId }: { gameId: string }) {
  const h = hashCode(gameId);
  const hue = h % 360;
  const color = `hsl(${hue}, 65%, 55%)`;
  const bgColor = `hsl(${hue}, 45%, 95%)`;
  const identiconStyle = {
    "--identicon-bg": bgColor,
    "--identicon-color": color,
  } as CSSProperties;

  // 3 columns × 5 rows = 15 bits → mirror cols 0,1 to get 4,3
  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    const left: boolean[] = [];
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col;
      left.push(((h >> bitIndex) & 1) === 1);
    }
    cells.push(...left, left[1], left[0]);
  }

  return (
    <div
      style={identiconStyle}
      className="grid h-16 w-16 shrink-0 grid-cols-5 gap-0.5 rounded-xl bg-[var(--identicon-bg)] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className={`rounded-[2px] transition-colors duration-300 ${on ? "bg-[var(--identicon-color)]" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
