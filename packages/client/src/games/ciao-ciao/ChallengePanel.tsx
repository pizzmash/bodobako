import { CC, FONT_HEADLINE } from "./constants";

interface ChallengePanelProps {
  declarerName: string;
  declarerColor: string;
  declaredValue: number;
  onTrust: () => void;
  onCallLiar: () => void;
}

export function ChallengePanel({
  declarerName,
  declarerColor,
  declaredValue,
  onTrust,
  onCallLiar,
}: ChallengePanelProps) {
  return (
    <div
      className="backdrop-blur-xl rounded-3xl px-6 py-5 text-center
                 shadow-2xl border border-white/10 max-w-[360px] w-full"
      style={{ background: `${CC.surfaceLow}cc` }}
    >
      <p className="text-sm mb-1" style={{ color: CC.onSurfaceVariant }}>
        <span className="font-bold" style={{ color: declarerColor }}>
          {declarerName}
        </span>
        {" "}の宣言:
      </p>
      <p
        className="text-4xl font-black mb-4 ciao-declare-pop"
        style={{ fontFamily: FONT_HEADLINE, color: CC.onSurface }}
      >
        {declaredValue}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onTrust}
          className="flex-1 py-3 rounded-xl font-bold text-sm
                     hover:scale-105 active:scale-95 transition-transform"
          style={{ background: CC.secondaryContainer, color: CC.onSurface }}
        >
          信じる
        </button>
        <button
          onClick={onCallLiar}
          className="flex-1 py-3 rounded-xl font-bold text-sm text-white
                     hover:scale-105 active:scale-95 transition-transform"
          style={{ background: CC.errorContainer }}
        >
          ウソだ！
        </button>
      </div>
    </div>
  );
}
