import type { CiaoCiaoStateView } from "@bodobako/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { BridgeTile } from "./BridgeTile";
import { CIAO_PLAYER_COLORS } from "./constants";
import { GoalArea } from "./GoalArea";
import { Meeple } from "./Meeple";
import { MeepleBubble } from "./MeepleBubble";

interface BridgeProps {
  state: CiaoCiaoStateView;
  highlightedTile?: number | null;
  getName: (pid: string) => string;
  getPhotoURL: (pid: string) => string | undefined;
  onAnimatingChange?: (animating: boolean) => void;
}

/** 空中コマの状態 */
interface InFlightMeeple {
  pid: string;
  colorIdx: number;
  /** タイルインデックスの経路 (0=START, 1-9=橋, 10=GOAL) */
  path: number[];
  /** 現在のステップ (path[step] が現在位置) */
  step: number;
  isFalling: boolean;
}

export function Bridge({ state, highlightedTile, getName, getPhotoURL, onAnimatingChange }: BridgeProps) {
  const tileRefs = useRef<(HTMLDivElement | null)[]>(Array(11).fill(null));
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<CiaoCiaoStateView | null>(null);
  const [inFlight, setInFlight] = useState<InFlightMeeple[]>([]);

  // アニメーション開始/終了を親に通知
  useEffect(() => {
    onAnimatingChange?.(inFlight.length > 0);
  }, [inFlight.length, onAnimatingChange]);

  // 移動検出: bridgePositions / goalSlots / goals / phase が変わったとき実行
  useEffect(() => {
    const prev = prevStateRef.current;
    const wasRevealing = prev?.phase === "revealing";
    const newFlights: InFlightMeeple[] = [];

    if (prev !== null) {
      for (const pid of state.playerIds) {
        const colorIdx = state.playerIds.indexOf(pid);
        const prevBridgePos = prev.bridgePositions[pid]; // null=橋上なし
        const currBridgePos = state.bridgePositions[pid];
        const prevGoals = prev.goals[pid] ?? 0;
        const currGoals = state.goals[pid] ?? 0;

        if (prevBridgePos === undefined) continue;

        // 1. ゴール到達: goals が増加した
        if (currGoals > prevGoals && prevBridgePos !== null) {
          const path: number[] = [];
          for (let i = prevBridgePos; i <= 10; i++) path.push(i);
          newFlights.push({ pid, colorIdx, path, step: 0, isFalling: false });
          continue;
        }

        // 2a. ゴールコマ喪失: revealing後にgoalsが減った（橋上コマなし → ゴール没収ペナルティ）
        if (wasRevealing && prevGoals > currGoals && prevBridgePos === null) {
          newFlights.push({ pid, colorIdx, path: [10], step: 0, isFalling: true });
          continue;
        }

        // 2b. 落下: revealing後にコマが消えた・スタートに戻った・スタートから交代した
        if (wasRevealing && prevBridgePos !== null) {
          const stockDecreased = (state.stocks[pid] ?? 0) < (prev.stocks[pid] ?? 0);
          const fallenFromBridge = prevBridgePos > 0 && (currBridgePos === null || currBridgePos === 0);
          const fallenFromStart = prevBridgePos === 0 &&
            (currBridgePos === null || (currBridgePos === 0 && stockDecreased));
          if (fallenFromBridge || fallenFromStart) {
            newFlights.push({ pid, colorIdx, path: [prevBridgePos], step: 0, isFalling: true });
            continue;
          }
        }

        // 3. 通常前進
        if (
          prevBridgePos !== null &&
          currBridgePos !== null &&
          currBridgePos > prevBridgePos
        ) {
          const path: number[] = [];
          for (let i = prevBridgePos; i <= currBridgePos; i++) path.push(i);
          newFlights.push({ pid, colorIdx, path, step: 0, isFalling: false });
        }
      }
    }

    // 検出後に前回状態を更新（次回比較のため）
    prevStateRef.current = state;

    if (newFlights.length > 0) {
      setInFlight(newFlights);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bridgePositions, state.goalSlots, state.goals, state.phase, state.playerIds]);

  // ステップ進行 (150ms/マス)
  useEffect(() => {
    if (inFlight.length === 0) return;

    const allAtEnd = inFlight.every((f) => f.step >= f.path.length - 1);
    if (allAtEnd) {
      const delay = inFlight.some((f) => f.isFalling) ? 900 : 250;
      const t = setTimeout(() => setInFlight([]), delay);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setInFlight((prev) =>
        prev.map((f) =>
          f.step < f.path.length - 1 ? { ...f, step: f.step + 1 } : f,
        ),
      );
    }, 150);
    return () => clearTimeout(t);
  }, [inFlight]);

  // 空中コマのpid集合 (タイル上の静止コマから除外するため)
  const inFlightPids = useMemo(() => new Set(inFlight.map((f) => f.pid)), [inFlight]);

  // タイルごとの静止コマ (空中を除く)
  const tileMeeples = useMemo(() => {
    const map: Record<number, { playerId: string; colorIndex: number }[]> = {};
    for (let i = 0; i <= 9; i++) map[i] = [];
    for (const pid of state.playerIds) {
      if (inFlightPids.has(pid)) continue;
      const pos = state.bridgePositions[pid];
      if (pos !== null && pos >= 0 && pos <= 9) {
        map[pos].push({ playerId: pid, colorIndex: state.playerIds.indexOf(pid) });
      }
    }
    return map;
  }, [state.bridgePositions, state.playerIds, inFlightPids]);

  // ゴール関連アニメーション中のpid集合
  // - goalFalling: ゴールコマが落下中 (path[0]===10 && isFalling)
  // - goalArriving: ゴールへ移動中 (path[-1]===10 && !isFalling)
  const goalFallingPids = useMemo(
    () => new Set(inFlight.filter((f) => f.isFalling && f.path[0] === 10).map((f) => f.pid)),
    [inFlight],
  );
  const goalArrivingPids = useMemo(
    () => new Set(inFlight.filter((f) => !f.isFalling && f.path[f.path.length - 1] === 10).map((f) => f.pid)),
    [inFlight],
  );

  // ゴールコマ:
  //   - ゴール到着アニメーション中のpidの最新1コマ（最大slotのもの）を除外
  //   - ゴール落下アニメーション中のpidの最古1コマ（最小slotのもの）を除外
  const goalMeeples = useMemo(() => {
    // ゴール到着中: 同pidの最大スロットを1件非表示
    const arrivalHideSlots = new Set<number>();
    for (const pid of goalArrivingPids) {
      const slots = state.goalSlots.filter((s) => s.playerId === pid);
      if (slots.length === 0) continue;
      const maxSlot = slots.reduce((a, b) => (a.slot > b.slot ? a : b));
      arrivalHideSlots.add(maxSlot.slot);
    }

    // ゴール落下中: 同pidの最小スロットを1件非表示
    const fallingHideSlots = new Set<number>();
    for (const pid of goalFallingPids) {
      const slots = state.goalSlots.filter((s) => s.playerId === pid);
      if (slots.length === 0) continue;
      const minSlot = slots.reduce((a, b) => (a.slot < b.slot ? a : b));
      fallingHideSlots.add(minSlot.slot);
    }

    return state.goalSlots
      .filter((s) => !arrivalHideSlots.has(s.slot) && !fallingHideSlots.has(s.slot))
      .map((s) => ({
        playerId: s.playerId,
        color: CIAO_PLAYER_COLORS[state.playerIds.indexOf(s.playerId)]?.meeple ?? "#888",
      }));
  }, [state.goalSlots, state.playerIds, goalFallingPids, goalArrivingPids]);

  /** タイルの中央ピクセル位置 (コンテナのローカル座標系) を返す */
  function getTilePos(tileIndex: number): { x: number; y: number } | null {
    const el = tileRefs.current[tileIndex];
    if (!el) return null;
    return {
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop,
    };
  }

  return (
    <div ref={containerRef} className="relative flex items-start justify-center gap-1 px-4">
      {/* ロープ上段（橋板を貫通して走る支索） */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          top: 7,
          left: 0,
          right: 0,
          height: 5,
          zIndex: 0,
          background: "repeating-linear-gradient(90deg, #4a2a08 0px, #9c7228 2.5px, #4a2a08 5px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)",
          borderRadius: 3,
        }}
      />
      {/* ロープ下段 */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          top: "calc(clamp(64px, 9vw, 112px) - 16px)",
          left: 0,
          right: 0,
          height: 5,
          zIndex: 0,
          background: "repeating-linear-gradient(90deg, #4a2a08 0px, #9c7228 2.5px, #4a2a08 5px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)",
          borderRadius: 3,
        }}
      />

      {/* スタート（岩石台マテリアル） */}
      <div
        ref={(el) => {
          tileRefs.current[0] = el;
        }}
        className="flex flex-col items-center shrink-0"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div
          className="flex items-end justify-center pb-2 relative"
          style={{
            width: "clamp(48px, 7vw, 80px)",
            height: "clamp(64px, 9vw, 112px)",
            background: [
              "radial-gradient(ellipse at 30% 22%, rgba(255,255,255,0.15) 0%, transparent 55%)",
              "repeating-linear-gradient(28deg, transparent 0px, transparent 10px, rgba(0,0,0,0.025) 10px, rgba(0,0,0,0.025) 11px)",
              "linear-gradient(155deg, #8e7e6e 0%, #695a4e 40%, #736050 72%, #524440 100%)",
            ].join(", "),
            borderRadius: "4px 4px 3px 3px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.24)",
          }}
        >
          <span
            className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold pointer-events-none"
            style={{ color: "rgba(255,255,255,0.55)", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
          >
            START
          </span>
          <div className="flex items-end justify-center">
            {(tileMeeples[0] ?? []).map((m, i) => (
              <div key={m.playerId} className={i > 0 ? "-ml-1" : ""}>
                <Meeple
                  color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
                  size={24}
                />
              </div>
            ))}
          </div>
        </div>
        {(tileMeeples[0] ?? []).length > 0 && (
          <div className="flex gap-0.5 mt-0.5" style={{ transformStyle: "flat" }}>
            {(tileMeeples[0] ?? []).map((m) => (
              <MeepleBubble
                key={m.playerId}
                name={getName(m.playerId)}
                photoURL={getPhotoURL(m.playerId)}
                color={CIAO_PLAYER_COLORS[m.colorIndex]?.meeple ?? "#888"}
              />
            ))}
          </div>
        )}
      </div>

      {/* マス 1〜9 */}
      {Array.from({ length: 9 }, (_, i) => i + 1).map((tileIdx) => (
        <BridgeTile
          key={tileIdx}
          ref={(el) => {
            tileRefs.current[tileIdx] = el;
          }}
          index={tileIdx}
          meeples={tileMeeples[tileIdx] ?? []}
          isHighlighted={highlightedTile === tileIdx}
          getName={getName}
          getPhotoURL={getPhotoURL}
        />
      ))}

      {/* ゴール */}
      <GoalArea
        ref={(el) => {
          tileRefs.current[10] = el;
        }}
        goalMeeples={goalMeeples}
        isHighlighted={highlightedTile != null && highlightedTile > 9}
      />

      {/* 空中コマオーバーレイ */}
      {inFlight.map((f) => {
        const pos = getTilePos(f.path[f.step]);
        if (!pos) return null;
        const color = CIAO_PLAYER_COLORS[f.colorIdx]?.meeple ?? "#888";
        const atEnd = f.step === f.path.length - 1;
        return (
          <div
            key={f.pid}
            className="pointer-events-none"
            style={{
              position: "absolute",
              left: pos.x - 12,
              top: pos.y + 6,
              transition: f.step > 0 ? "left 0.13s ease-in-out, top 0.13s ease-in-out" : "none",
              zIndex: 20,
            }}
          >
            <Meeple
              color={color}
              size={24}
              falling={f.isFalling}
              className={atEnd && !f.isFalling ? "ciao-meeple-land" : ""}
            />
          </div>
        );
      })}
    </div>
  );
}
