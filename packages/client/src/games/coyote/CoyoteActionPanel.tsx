import { useState } from 'react';
import { ArrowUpRight, Minus, Radio } from 'lucide-react';
import type { CoyotePlayerView } from '@bodobako/shared';

export function CoyoteActionPanel({ state, enabled, pending, onBid, onChallenge }: {
  state: CoyotePlayerView; enabled: boolean; pending: boolean; onBid: (value: number) => void; onChallenge: () => void;
}) {
  const minimum = state.lastBid ? state.lastBid.value + 1 : 1;
  const [input, setInput] = useState(String(Math.min(minimum, Number.MAX_SAFE_INTEGER)));
  const value = Number(input);
  const valid = input.trim() !== '' && Number.isSafeInteger(value) && value >= minimum;
  const canRaise = minimum <= Number.MAX_SAFE_INTEGER;
  return <div className="cy-actions">
    <div className="flex items-center gap-2 cy-gold text-sm font-bold mb-3"><Radio size={16} />{pending ? '送信中…' : 'あなたの番です'}</div>
    <div className="cy-action-grid">
      <form onSubmit={event => { event.preventDefault(); if (enabled && valid) onBid(value); }} className="min-w-0">
        <div className="cy-number-control"><button type="button" className="cy-icon-button" aria-label="宣言する数を1減らす" disabled={!enabled || !canRaise || !valid || value <= minimum} onClick={() => setInput(String(value - 1))}><Minus size={18} /></button>
          <input aria-label="宣言する数" inputMode="numeric" value={input} onChange={event => setInput(event.target.value)} disabled={!enabled || !canRaise} autoComplete="off" maxLength={16} />
          <ArrowUpRight size={20} className="cy-gold mr-3" aria-hidden="true" />
        </div>
        <div className="flex gap-2 my-2">{[1, 5, 10].map(step => <button type="button" key={step} className="cy-increment" disabled={!enabled || !canRaise || !Number.isSafeInteger(value + step)} onClick={() => setInput(String(Math.max(minimum, (Number.isSafeInteger(value) ? value : minimum) + step)))}>+{step}</button>)}</div>
        <button type="submit" className="cy-bid-button" disabled={!enabled || !valid}>{valid ? `${value}を宣言` : '数字を確認してください'}<ArrowUpRight size={18} /></button>
      </form>
      <div className="cy-challenge-group"><p className="text-sm">{state.lastBid ? `${state.lastBid.value}は多すぎる？` : '最初は数字を宣言'}</p><button className="cy-challenge-button" onClick={onChallenge} disabled={!enabled || !state.lastBid}>コヨーテ！<span>COYOTE</span></button><p className="cy-help-text">{state.lastBid ? '直前の宣言に挑戦する' : 'まだ挑戦できません'}</p></div>
    </div>
    {enabled && !valid && canRaise && <p className="text-sm mt-2" role="status">{minimum}以上の整数を入力してください。</p>}
    {!canRaise && <p className="text-sm mt-2">宣言の上限に達しました。コヨーテで挑戦してください。</p>}
  </div>;
}
