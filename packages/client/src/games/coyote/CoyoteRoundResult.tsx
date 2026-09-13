import { useState } from 'react';
import { ArrowRight, Moon, Trophy } from 'lucide-react';
import type { CoyotePlayerView } from '@bodobako/shared';
import { CoyoteCard } from './CoyoteCard';
import { cardLabel } from './constants';

export function CoyoteRoundResult({ state, name, canContinue, pending, onContinue, skipInitial = false }: { state: CoyotePlayerView; skipInitial?: boolean; name: (id: string) => string; canContinue: boolean; pending: boolean; onContinue: () => void }) {
  const [skip, setSkip] = useState(skipInitial);
  const r = state.roundResult;
  if (!r) return null;
  const terms = [...r.cards.map(item => item.card), ...(r.extraCard ? [r.extraCard] : [])];
  return <section className={`cy-round-result ${skip ? 'cy-skip-motion' : ''}`} aria-label="ラウンドの判定">
    <div className="flex items-center justify-between gap-3"><span className="cy-eyebrow">THE REVEAL</span><button className="cy-text-button" onClick={() => setSkip(true)}>演出をスキップ</button></div>
    <h2 className="cy-result-heading">コヨーテ<span className={r.success ? 'cy-success' : 'cy-failure'}>{r.success ? '成功' : '失敗'}！</span></h2>
    <p className="cy-help-text">{name(r.challengerId)}が、{name(r.bid.playerId)}の宣言に挑戦</p>
    <div className="cy-reveal-cards">{r.cards.map((item, index) => <div key={item.playerId} className="cy-reveal-card"><span className="cy-seat-name">{name(item.playerId)}</span><CoyoteCard card={item.card} muted={r.foxTargetIndex === index} /></div>)}
      {r.extraCard && <div className="cy-reveal-card cy-extra-card"><span className="cy-seat-name">? の追加札</span><CoyoteCard card={r.extraCard} muted={r.foxTargetIndex === r.cards.length} /></div>}
    </div>
    <div className="cy-equation" aria-label="計算の内訳">
      {r.extraCard && <p>? の追加札：{cardLabel(r.extraCard)}</p>}
      {r.foxTargetIndex !== null && <p>キツネ：{cardLabel(terms[r.foxTargetIndex])}の1枚を0に</p>}
      <p>{terms.map((card, i) => card.kind === 'number' ? (i === r.foxTargetIndex ? '0' : card.value < 0 ? `(${card.value})` : String(card.value)) : '0').join(' + ')} = {r.subtotal}</p>
      {r.multiplier === 2 && <p>×2：{r.subtotal} × 2 = {r.total}</p>}
    </div>
    <div className="cy-comparison"><div><span>宣言</span><strong>{r.bid.value}</strong></div><b>{r.success ? '>' : '≤'}</b><div><span>実際の合計</span><strong>{r.total}</strong></div></div>
    <p className="text-center text-sm mb-4">{r.success ? '宣言が合計を超えていました。' : '合計以下なので、宣言した人のセーフ。'}</p>
    <div className="cy-damage"><strong>{name(r.loserId)}</strong><span>ライフ −1</span><b>{r.livesAfter ? `残り ${r.livesAfter}` : '脱落'}</b></div>
    {r.resetDeck && <p className="cy-help-text flex items-center gap-2 mt-3"><Moon size={16} />次の配札前に全36枚を混ぜ直します。</p>}
    {state.winnerId && <p className="cy-winner"><Trophy size={22} />{name(state.winnerId)}が優勝！</p>}
    {state.phase !== 'finished' && <div className="mt-5">{canContinue ? <button className="cy-bid-button" disabled={pending} onClick={onContinue}>{pending ? '送信中…' : state.winnerId ? '最終結果へ' : '次のラウンドへ'}<ArrowRight size={18} /></button> : <p className="cy-help-text text-center">{name(state.playerIds[state.currentPlayerIndex])}の{state.winnerId ? '結果確認' : '次のラウンド開始'}を待っています</p>}</div>}
  </section>;
}
