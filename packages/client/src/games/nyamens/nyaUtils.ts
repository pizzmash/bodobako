/** ニャーメンズ ゲーム共有ユーティリティ */

/** 危険/アサシン表示用カラー */
export const DANGER = "#DC2626";

/** 手札カードの数値に応じた背景色 */
export function cardColor(num: number): string {
  if (num <= 10) return "#BAE6FD";
  if (num <= 20) return "#BBF7D0";
  return "#FED7AA";
}
