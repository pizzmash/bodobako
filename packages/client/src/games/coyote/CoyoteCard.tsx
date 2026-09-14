import type { CoyoteVisibleCard } from '@bodobako/shared';
import { Moon, Sparkles, Mountain, ChevronsUp } from 'lucide-react';
import { CoyoteEmblem } from './CoyoteEmblem';
import { cardLabel, cardName } from './constants';

export function CoyoteCard({ card, muted = false }: { card: CoyoteVisibleCard; muted?: boolean }) {
  const hidden = 'hidden' in card;
  if (hidden) return <div className="cy-card cy-card-back" role="img" aria-label="あなたのカード、非公開">
    <div className="cy-card-inner"><CoyoteEmblem className="w-16 sm:w-20" /><span className="cy-card-back-label">COYOTE</span></div>
  </div>;
  const Icon = card.kind === 'night' ? Moon : card.kind === 'cave' ? Mountain : card.kind === 'double' ? ChevronsUp : Sparkles;
  return <div className={`cy-card cy-card-face ${card.kind !== 'number' ? 'cy-card-special' : ''} ${card.kind === 'number' && card.value < 0 ? 'cy-card-negative' : ''} ${muted ? 'cy-card-zeroed' : ''}`} role="img" aria-label={`${cardName(card)} ${cardLabel(card)}${muted ? '、0として計算' : ''}`}>
    <div className="cy-card-corner" aria-hidden="true">{cardLabel(card)}</div>
    <div className="cy-card-inner">
      {card.kind === 'number' ? <CoyoteEmblem className="cy-card-art" /> : <Icon className="cy-card-art" strokeWidth={1} />}
      <span className={`cy-card-number ${card.kind === 'fox' ? 'cy-card-word' : ''}`}>{cardLabel(card)}</span>
      <span className="cy-card-name">{cardName(card)}</span>
    </div>
    {muted && <span className="cy-zero-stamp">→ 0</span>}
  </div>;
}
