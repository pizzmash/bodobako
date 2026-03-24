import type { ChallengeResult } from "@bodobako/shared";
import { Z } from "../../styles/tokens";
import { CC, FONT_HEADLINE } from "./constants";
import { DiceFace } from "./DiceFace";

interface RevealOverlayProps {
  result: ChallengeResult;
  declarerName: string;
  challengerName: string;
  isMyTurn: boolean;
  onAck: () => void;
}

export function RevealOverlay({
  result,
  declarerName,
  challengerName,
  isMyTurn,
  onAck,
}: RevealOverlayProps) {
  const fallenName = result.wasLying ? declarerName : challengerName;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm"
      style={{ zIndex: Z.gameModal }}
    >
      <div
        className="backdrop-blur-xl rounded-3xl px-8 py-7 text-center max-w-[380px] shadow-2xl"
        style={{ background: `${CC.surfaceLow}f2` }}
      >
        <DiceFace value={result.actualRoll} size="lg" animate />

        {result.wasLying ? (
          <>
            <h2
              className="text-3xl font-black mt-2 ciao-busted-shake"
              style={{ fontFamily: FONT_HEADLINE, color: CC.error }}
            >
              ウソだった！
            </h2>
            <p className="mt-1 text-sm" style={{ color: CC.onSurfaceVariant }}>
              {fallenName} のコマが落下！
            </p>
          </>
        ) : (
          <>
            <h2
              className="text-3xl font-black mt-2"
              style={{ fontFamily: FONT_HEADLINE, color: CC.primary }}
            >
              本当だった！
            </h2>
            <p className="mt-1 text-sm" style={{ color: CC.onSurfaceVariant }}>
              {fallenName} のコマが落下！
            </p>
          </>
        )}

        {isMyTurn && (
          <button
            onClick={onAck}
            className="mt-4 px-6 py-2.5 rounded-full font-bold text-sm
                       hover:scale-105 active:scale-95 transition-transform"
            style={{ background: CC.primary, color: CC.onPrimary }}
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
