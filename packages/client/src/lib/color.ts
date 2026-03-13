/** プレイヤー識別用カラー（最大6人分） */
export const PLAYER_COLORS = ["#0496ff", "#ff5c8d", "#22c55e", "#06d6a0", "#9d4edd", "#ec4899"];

/**
 * hex カラーにアルファ値を適用して rgba() 文字列を返すユーティリティ。
 * 3桁・6桁のhex両対応。
 */
export function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
