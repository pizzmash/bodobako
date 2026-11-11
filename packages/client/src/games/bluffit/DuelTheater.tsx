import { useEffect, useRef, useState } from "react";
import { Eye, LockKeyhole, Swords, Trophy } from "lucide-react";
import type { BluffitView } from "@bodobako/shared";
import { NumberCard } from "./NumberCard";

type Duel = BluffitView["duels"][number];

export function DuelTheater({
  duels,
  playerId,
  name,
}: {
  duels: Duel[];
  playerId: string;
  name: (id: string) => string;
}) {
  // Joining or reconnecting starts at the live table. New duels play in order.
  const [cursor, setCursor] = useState(duels.length);
  const duel = duels[cursor];
  if (!duel) return null;
  return (
    <Showdown
      key={cursor}
      duel={duel}
      playerId={playerId}
      name={name}
      onDone={() => setCursor(cursor + 1)}
    />
  );
}

function Showdown({
  duel,
  playerId,
  name,
  onDone,
}: {
  duel: Duel;
  playerId: string;
  name: (id: string) => string;
  onDone: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<"facedown" | "turning" | "result">("facedown");
  const participant = playerId === duel.attacker || playerId === duel.defender;
  const tied = participant && duel.attack !== undefined && duel.attack === duel.defense;
  const stolen = duel.winner === duel.attacker;
  const result = phase === "result";
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (!participant && phase === "facedown") {
      const timer = window.setTimeout(() => setPhase("result"), 1400);
      return () => window.clearTimeout(timer);
    }
    if (phase === "turning") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timer = window.setTimeout(() => setPhase("result"), reduced ? 0 : 460);
      return () => window.clearTimeout(timer);
    }
  }, [participant, phase]);
  const reveal = () => setPhase(participant ? "turning" : "result");
  return (
    <dialog
      ref={dialog}
      className="bf-duel"
      aria-labelledby="bf-duel-title"
      onCancel={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <div className="bf-duel-inner">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span>第{duel.round}ラウンド</span>
          <button className="bf-skip" onClick={onDone}>
            盤面に戻る
          </button>
        </div>
        <p className="bf-stake">
          <Swords size={15} /> {duel.prize}点の得点札をめぐる
        </p>
        <h2 id="bf-duel-title">一騎打ち</h2>
        <div className="bf-match">
          {[duel.attacker, duel.defender].map((id, i) => {
            const own = playerId === id;
            const value = i === 0 ? duel.attack : duel.defense;
            const shown = participant && (own || phase !== "facedown") && value !== undefined;
            const canTurn = participant && !own && phase === "facedown";
            const face = shown ? (
              <NumberCard value={value} />
            ) : (
              <span className="bf-hidden-face">
                <LockKeyhole size={24} />
              </span>
            );
            return (
              <div className="bf-contender" key={id}>
                <small>{i === 0 ? "挑戦側" : "防衛側"}</small>
                <strong>
                  {name(id)}
                  {own && "（自分）"}
                </strong>
                {canTurn ? (
                  <button className="bf-duel-card" aria-label="相手の伏せ札をめくる" onClick={reveal}>
                    {face}
                  </button>
                ) : (
                  <div
                    className={`bf-duel-card ${!own && shown ? "bf-turned" : ""} ${result && duel.winner === id ? "bf-victor" : ""}`}
                    aria-label={shown ? `指し値 ${value}` : "伏せ札"}
                  >
                    {face}
                    {!own && phase === "turning" && (
                      <span className="bf-hidden-face bf-flipping-back" aria-hidden="true">
                        <LockKeyhole size={24} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <span className="bf-vs" aria-hidden="true">
            VS
          </span>
        </div>
        <div className="bf-verdict" aria-live="polite">
          {result ? (
            <>
              <strong>
                <Trophy size={18} /> {name(duel.winner)} が{stolen ? "奪取" : "防衛"}！
              </strong>
              <p>
                {tied ? "同じ指し値のため、挑戦側の勝ち。" : ""}
                {duel.prize}点の札を確保しました。
              </p>
            </>
          ) : (
            <p>
              {participant ? "相手は、いくつで勝負に出た？" : "ふたりが伏せた指し値を見比べています…"}
            </p>
          )}
        </div>
        <button
          className="bf-duel-action"
          autoFocus
          onClick={result ? onDone : reveal}
          disabled={phase === "turning"}
        >
          {result ? (
            "テーブルへ"
          ) : (
            <>
              <Eye size={17} /> {participant ? "相手の指し値を見る" : "勝負を見届ける"}
            </>
          )}
        </button>
      </div>
    </dialog>
  );
}
