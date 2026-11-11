import { useEffect, useRef, useState } from "react";
import { Eye, LockKeyhole, Swords, Trophy } from "lucide-react";
import type { BluffitView } from "@bodobako/shared";
import { NumberCard } from "./NumberCard";

type Duel = BluffitView["duels"][number];
type Pending = NonNullable<BluffitView["pendingDuel"]>;

export function DuelTheater({
  duels,
  pending,
  ownBid,
  onReveal,
  playerId,
  name,
}: {
  duels: Duel[];
  pending: Pending | null;
  ownBid: number | null;
  onReveal: () => void;
  playerId: string;
  name: (id: string) => string;
}) {
  // A new challenge takes precedence even if the previous result is still on screen.
  const [dismissed, setDismissed] = useState(duels.length);
  const resolved = !pending && duels.length > dismissed ? duels.at(-1) : undefined;
  const duel = pending ?? resolved;
  if (!duel) return null;
  return (
    <Showdown
      key={pending ? duels.length : duels.length - 1}
      duel={duel}
      resolved={resolved}
      ownBid={ownBid}
      onReveal={onReveal}
      playerId={playerId}
      name={name}
      onDone={() => setDismissed(duels.length)}
    />
  );
}

function Showdown({
  duel,
  resolved,
  ownBid,
  onReveal,
  playerId,
  name,
  onDone,
}: {
  duel: Pending;
  resolved?: Duel;
  ownBid: number | null;
  onReveal: () => void;
  playerId: string;
  name: (id: string) => string;
  onDone: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState(false);
  const revealed = !!resolved;
  const participant = playerId === duel.attacker || playerId === duel.defender;
  const tied = participant && resolved?.attack !== undefined && resolved.attack === resolved.defense;
  const stolen = resolved?.winner === duel.attacker;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (!revealed) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setResult(true), reduced || !participant ? 0 : 460);
    return () => window.clearTimeout(timer);
  }, [revealed, participant]);
  return (
    <dialog
      ref={dialog}
      className="bf-duel"
      aria-labelledby="bf-duel-title"
      onCancel={(e) => {
        e.preventDefault();
        if (resolved) onDone();
      }}
    >
      <div className="bf-duel-inner">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span>第{duel.round}ラウンド</span>
          {resolved && (
            <button className="bf-skip" onClick={onDone}>
              盤面に戻る
            </button>
          )}
        </div>
        <p className="bf-stake">
          <Swords size={15} /> {duel.prize}点の得点札をめぐる
        </p>
        <h2 id="bf-duel-title">一騎打ち</h2>
        <div className="bf-match">
          {[duel.attacker, duel.defender].map((id, i) => {
            const own = playerId === id;
            const value = resolved
              ? i === 0
                ? resolved.attack
                : resolved.defense
              : own
                ? ownBid
                : null;
            const shown = value != null;
            const canTurn = playerId === duel.attacker && !own && !resolved;
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
                  <button className="bf-duel-card" aria-label="相手の伏せ札をめくる" onClick={onReveal}>
                    {face}
                  </button>
                ) : (
                  <div
                    className={`bf-duel-card ${!own && shown ? "bf-turned" : ""} ${result && resolved?.winner === id ? "bf-victor" : ""}`}
                    aria-label={shown ? `指し値 ${value}` : "伏せ札"}
                  >
                    {face}
                    {!own && shown && !result && (
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
          {result && resolved ? (
            <>
              <strong>
                <Trophy size={18} /> {name(resolved.winner)} が{stolen ? "奪取" : "防衛"}！
              </strong>
              <p>
                {tied ? "同じ指し値のため、挑戦側の勝ち。" : ""}
                {duel.prize}点の札を確保しました。
              </p>
            </>
          ) : (
            <p>
              {playerId === duel.attacker
                ? "相手は、いくつで勝負に出た？"
                : `${name(duel.attacker)} が伏せ札をめくるのを待っています…`}
            </p>
          )}
        </div>
        {(result || playerId === duel.attacker) && (
          <button
            className="bf-duel-action"
            autoFocus
            onClick={result ? onDone : onReveal}
            disabled={!!resolved && !result}
          >
            {result ? (
              "テーブルへ"
            ) : (
              <>
                <Eye size={17} /> 相手の指し値を見る
              </>
            )}
          </button>
        )}
      </div>
    </dialog>
  );
}
