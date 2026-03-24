import { useCallback, useState } from "react";
import { CC, FONT_HEADLINE } from "./constants";
import { DiceFace } from "./DiceFace";

interface DiceAreaProps {
  onRoll: () => void;
}

export function DiceArea({ onRoll }: DiceAreaProps) {
  const [rolling, setRolling] = useState(false);

  const handleRoll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    // アニメーション後にサーバーへ送信
    setTimeout(() => {
      onRoll();
      setRolling(false);
    }, 600);
  }, [onRoll, rolling]);

  return (
    <div
      className="backdrop-blur-xl rounded-full p-6 shadow-2xl border border-white/20
                 flex flex-col items-center gap-3"
      style={{ background: `${CC.surfaceContainer}e6` }}
    >
      <div className={rolling ? "ciao-dice-shake" : ""}>
        <DiceFace value="?" size="md" />
      </div>
      <button
        onClick={handleRoll}
        disabled={rolling}
        className="font-extrabold px-6 py-2.5 rounded-full text-xs tracking-widest
                   uppercase hover:scale-105 active:scale-95 transition-transform
                   disabled:opacity-60"
        style={{
          background: CC.primary,
          color: CC.onPrimary,
          fontFamily: FONT_HEADLINE,
        }}
      >
        サイコロを振る
      </button>
    </div>
  );
}
