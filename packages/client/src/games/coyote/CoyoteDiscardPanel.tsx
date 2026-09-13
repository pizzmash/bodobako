import { COYOTE_CARD_GROUPS, coyoteCardKey, type CoyotePlayerView } from '@bodobako/shared';
import { CoyotePanel } from './CoyotePanel';

export function CoyoteDiscardPanel({ state, onClose }: { state: CoyotePlayerView; onClose: () => void }) {
  return <CoyotePanel title={`使用済みカード · ${state.discardCount}枚`} onClose={onClose}>
    <p className="cy-help-text mb-5">全員に公開されている捨て札です。山札に戻ると使用済み枚数はリセットされます。今のラウンドのカードは含みません。</p>
    <table className="cy-discard-table"><thead><tr><th>カード</th><th>使用済み</th><th>全体</th></tr></thead><tbody>
      {COYOTE_CARD_GROUPS.map(group => {
        const key = coyoteCardKey(group.face);
        const used = state.discardCounts[key] ?? 0;
        return <tr key={key}><th>{group.label}</th><td><span className={used ? 'cy-used-count' : 'cy-unused-count'}>{used}枚</span></td><td>{group.count}枚</td></tr>;
      })}
    </tbody></table>
    <p className="cy-help-text mt-4">山札は残り{state.deckCount}枚。山札の内訳・順番は非公開です。</p>
  </CoyotePanel>;
}
