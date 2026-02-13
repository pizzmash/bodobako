import { useState, useEffect, useRef } from "react";
import type { AiueBattleState } from "@bodobako/shared";

export function useAiueState(state: AiueBattleState | null) {
  const [attackAnim, setAttackAnim] = useState<"hit" | "miss" | null>(null);
  const [newlyRevealed, setNewlyRevealed] = useState<Set<string>>(new Set());
  const prevRevealedRef = useRef<Record<string, (boolean | "end")[]>>({});

  // Track attack result changes for animation
  useEffect(() => {
    if (!state || state.phase !== "battle") return;
    if (state.lastAttackChar) {
      setAttackAnim(state.lastAttackHit ? "hit" : "miss");
      const timer = setTimeout(() => setAttackAnim(null), 600);
      return () => clearTimeout(timer);
    }
  }, [state?.lastAttackChar, state?.lastAttackHit, state?.phase]);

  // Track newly revealed cells for flip animation
  useEffect(() => {
    if (!state || state.phase !== "battle") return;
    const prev = prevRevealedRef.current;
    const fresh = new Set<string>();
    for (const pid of state.playerIds) {
      const rev = state.revealed[pid];
      const prevRev = prev[pid];
      if (rev) {
        rev.forEach((v, i) => {
          if (v && (!prevRev || !prevRev[i])) {
            fresh.add(`${pid}-${i}`);
          }
        });
      }
    }
    if (fresh.size > 0) {
      setNewlyRevealed(fresh);
      const timer = setTimeout(() => setNewlyRevealed(new Set()), 500);
      // snapshot current revealed state
      const snapshot: Record<string, (boolean | "end")[]> = {};
      for (const pid of state.playerIds) {
        if (state.revealed[pid]) snapshot[pid] = [...state.revealed[pid]];
      }
      prevRevealedRef.current = snapshot;
      return () => clearTimeout(timer);
    }
    // snapshot even if no new reveals
    const snapshot: Record<string, (boolean | "end")[]> = {};
    for (const pid of state.playerIds) {
      if (state.revealed[pid]) snapshot[pid] = [...state.revealed[pid]];
    }
    prevRevealedRef.current = snapshot;
  }, [state?.revealed, state?.phase, state?.playerIds]);

  return { attackAnim, newlyRevealed };
}
