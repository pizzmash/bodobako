import { useState } from "react";
import { BookOpen, Layers, LockKeyhole, Swords } from "lucide-react";
import type { BluffitMove } from "@bodobako/shared";
import { useRoom } from "../../context/RoomContext";
import { GameResultCard } from "../../components/GameResultCard";
import { NumberCard } from "./NumberCard";
import { DuelTheater } from "./DuelTheater";

export default function BluffitBoard() {
  const ctx = useRoom();
  const { gameState, playerId, room, gameResult } = ctx;
  const [selection, select] = useState<{ round: number; value: number; game: number } | null>(null);
  if (gameState?.gameId !== "bluffit" || !playerId || !room) return null;
  const s = gameState.state;
  const name = (id: string) =>
    (ctx.resultPlayers ?? room.players).find((p) => p.id === id)?.name ?? "プレイヤー";
  const mayBid = s.phase === "bid" && s.bid === null && s.order.includes(playerId);
  const mayClaim = s.phase === "claim" && !s.pendingDuel && s.order[s.turn] === playerId;
  const chosen =
    selection?.round === s.round && selection.game === ctx.gameStartCount ? selection.value : null;
  const send = (move: BluffitMove) => {
    select(null);
    ctx.sendMove(move);
  };
  const title = s.round === 11 ? "最終ラウンド" : `ラウンド ${s.round}`;
  const instruction = !s.order.includes(playerId)
    ? "最終ラウンドを観戦中"
    : mayBid
      ? "指し値を1枚選んでください"
      : mayClaim
        ? "場札を取るか、一騎打ちを仕掛けましょう"
        : s.phase === "bid"
          ? "ほかの人が指し値を選んでいます"
          : `${name(s.order[s.turn])} の手番です`;
  const scores = Object.entries(s.scores ?? {}).sort((a, b) => b[1] - a[1]);
  const winners = scores.filter(([, score]) => score === scores[0]?.[1]).map(([id]) => id);
  if (!scores.length && gameResult?.ranking?.length) winners.push(gameResult.ranking[0]);
  const result = !winners.length ? "draw" : winners.includes(playerId) ? "win" : "lose";
  const duel = s.duels.at(-1);

  return (
    <main className="bf-table">
      <DuelTheater
        key={ctx.gameStartCount}
        duels={s.duels}
        pending={gameResult ? null : s.pendingDuel}
        ownBid={s.bid}
        playerId={playerId}
        name={name}
        onReveal={() => send({ type: "reveal", round: s.round })}
      />
      <div className="bf-wrap">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="bf-logo">
            BLUFF<span>IT</span>
          </h1>
          <details className="bf-rules">
            <summary>
              <BookOpen size={16} /> 遊び方
            </summary>
            <p>
              全員が1〜10の手札から1枚を伏せます。順番が来たら、場の得点札を取るか、誰かが確保中の札に挑戦します。
            </p>
            <p>
              一騎打ちでは伏せた数が大きい方、同じなら挑戦側が勝利。全員の手番が終わると確保札が得点になり、伏せた札が次の場札になります。最高の札を取った人が次の先手です。
            </p>
            <p>
              10回遊んだ後、得点札が2枚以上ある人はそこから1枚を消費して最終戦へ。残った得点の合計が最多の人が全員優勝です。
            </p>
          </details>
        </header>
        {gameResult ? (
          <section className="mx-auto max-w-md py-6">
            <h2 className="text-xl font-bold">{scores.length ? "最終得点" : "対戦終了"}</h2>
            {scores.map(([id, score]) => (
              <div className="bf-score" key={id}>
                <span>{name(id)}</span>
                <strong>{score} 点</strong>
              </div>
            ))}
            <GameResultCard
              result={result}
              winnerName={winners.map(name).join("・")}
              isHost={room.hostId === playerId}
              playerId={playerId}
              resultPlayers={ctx.resultPlayers ?? undefined}
              rematchRequests={ctx.rematchRequests}
              onRematchRequest={ctx.requestRematch}
              onRematch={ctx.startGame}
              onLeave={ctx.leaveRoom}
            />
          </section>
        ) : (
          <>
            <section className="bf-arena">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{title}</h2>
                <span className="bf-phase">
                  {s.phase === "bid"
                    ? `指し値　${s.ready.length} / ${s.order.length}`
                    : `争奪戦　${s.turn + 1} / ${s.order.length}`}
                </span>
              </div>
              <div className="bf-progress" aria-hidden="true">
                {Array.from({ length: 11 }, (_, i) => (
                  <i className={i < s.round ? "bf-lit" : ""} key={i} />
                ))}
              </div>
              <p className="bf-prompt" role="status">
                {instruction}
              </p>
              <div className="bf-market">
                {s.market.map((v, i) => (
                  <button
                    key={`${s.round}-${i}-${v}`}
                    disabled={!mayClaim}
                    aria-label={`${v} 点の場札を取る`}
                    onClick={() => send({ type: "take", value: v, round: s.round })}
                  >
                    <NumberCard value={v} />
                  </button>
                ))}
              </div>
              <div className="bf-seats">
                {s.order.map((id, i) => (
                  <button
                    key={id}
                    className={s.phase === "claim" && i === s.turn ? "bf-active" : ""}
                    disabled={!mayClaim || !s.claims[id] || id === playerId}
                    onClick={() => send({ type: "challenge", target: id, round: s.round })}
                  >
                    {s.ready.includes(id) && <i className="bf-back" aria-hidden="true" />}
                    <strong>
                      {name(id)}
                      {id === playerId && "（自分）"}
                    </strong>
                    <span>
                      {s.claims[id] ? (
                        <>
                          <Swords size={14} />
                          {s.claims[id]} 点{mayClaim ? "に挑戦" : "を確保"}
                        </>
                      ) : s.ready.includes(id) ? (
                        <>
                          <LockKeyhole size={13} /> 伏せ札
                        </>
                      ) : (
                        "選択中"
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {s.lastAwards && (
                <details className="bf-recap">
                  <summary>
                    第{s.lastAwards.round}戦の結果　·　あなたの獲得 {s.lastAwards.prizes[playerId] ?? 0}{" "}
                    点
                  </summary>
                  <ul>
                    {s.playerIds.map((id) => (
                      <li key={id}>
                        {name(id)}　{s.lastAwards?.prizes[id] ?? 0} 点
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
            <section className="bf-hand">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-bold">
                  <Layers size={18} />
                  {s.round === 11 ? "あなたの得点札" : "あなたの手札"}
                </h2>
                <span className="text-xs">獲得 {s.pile.reduce((a, b) => a + b, 0)} 点</span>
              </div>
              {s.round === 11 && (
                <p className="mt-2 text-sm">最終戦で伏せた1枚は、得点から差し引かれます。</p>
              )}
              <div className="bf-rack">
                {s.hand.map((v, i) => (
                  <button
                    key={`${v}-${i}`}
                    className={mayBid && chosen === v ? "bf-picked" : ""}
                    disabled={!mayBid}
                    aria-label={`指し値 ${v} を選ぶ`}
                    aria-pressed={mayBid && chosen === v}
                    onClick={() => select({ round: s.round, value: v, game: ctx.gameStartCount })}
                  >
                    <NumberCard value={v} />
                  </button>
                ))}
              </div>
              {mayBid ? (
                <button
                  className="bf-submit"
                  disabled={chosen === null}
                  onClick={() => chosen !== null && send({ type: "bid", value: chosen, round: s.round })}
                >
                  <LockKeyhole size={16} />
                  {chosen === null ? "手札を選んでください" : `${chosen} を伏せる`}
                </button>
              ) : (
                s.bid !== null && (
                  <p className="bf-secret">
                    <LockKeyhole size={15} /> あなたの指し値 <b>{s.bid}</b>
                  </p>
                )
              )}
            </section>
          </>
        )}
        {duel && (
          <details key={s.duels.length} open className="bf-history">
            <summary>
              <Swords size={16} /> 一騎打ちの記録
            </summary>
            {s.duels
              .slice()
              .reverse()
              .map((d, i) => (
                <p key={i}>
                  R{d.round}　{name(d.attacker)} → {name(d.defender)}{" "}
                  {d.attack !== undefined && (
                    <b>
                      （{d.attack} 対 {d.defense}）
                    </b>
                  )}{" "}
                  · {name(d.winner)} が {d.prize} 点を確保
                </p>
              ))}
          </details>
        )}
      </div>
    </main>
  );
}
