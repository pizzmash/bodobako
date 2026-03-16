import { useEffect, useRef } from "react";

const STORAGE_KEY = "bodobako_muted";

function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // AudioContext 非対応環境では無視
  }
}

/**
 * 自分の手番になったとき通知音を鳴らす。
 * ミュート設定は localStorage から直接読み取る（状態共有不要）。
 */
export function useTurnSound(
  currentTurnPlayerId: string | null,
  myPlayerId: string | null,
  gameStartCount: number,
): void {
  const prevTurnRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevTurnRef.current;
    prevTurnRef.current = currentTurnPlayerId;

    // 手番が自分に変わった（または最初から自分の手番だった）時に音を鳴らす
    if (
      currentTurnPlayerId !== null &&
      currentTurnPlayerId === myPlayerId &&
      prev !== currentTurnPlayerId
    ) {
      const muted = localStorage.getItem(STORAGE_KEY) === "true";
      if (!muted) playBeep();
    }
  }, [currentTurnPlayerId, myPlayerId, gameStartCount]);
}
