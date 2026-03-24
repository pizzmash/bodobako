import type { DiceValue } from "@bodobako/shared";
import { X } from "lucide-react";
import { CC, FONT_HEADLINE } from "./constants";

interface DiceFaceProps {
  value: DiceValue | null | "?";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

const sizeMap = { sm: 40, md: 64, lg: 80 };
const fontMap = { sm: 24, md: 40, lg: 52 };
const iconMap = { sm: 20, md: 32, lg: 42 };

export function DiceFace({ value, size = "md", animate }: DiceFaceProps) {
  const s = sizeMap[size];
  const fs = fontMap[size];
  const isX = value === "x";
  const display = value === null || value === "?" ? "?" : isX ? null : String(value);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white shadow-inner
                  border-2 border-gray-200 ${animate ? "ciao-dice-reveal" : ""}`}
      style={{
        width: s,
        height: s,
        fontSize: fs,
        fontWeight: 900,
        lineHeight: 1,
        fontFamily: FONT_HEADLINE,
        color: value === "?" || value === null ? CC.outline : CC.onSurface,
      }}
    >
      {isX ? (
        <X size={iconMap[size]} strokeWidth={3.5} color={CC.error} />
      ) : (
        display
      )}
    </div>
  );
}
