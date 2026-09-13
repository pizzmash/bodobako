import { COYOTE_CARD_GROUPS } from '@bodobako/shared';
import { CoyotePanel } from './CoyotePanel';

export function CoyoteRulesPanel({ onClose }: { onClose: () => void }) {
  return <CoyotePanel title="月夜の駆け引き · 遊び方" onClose={onClose}>
    <ol className="cy-rules-steps">
      <li><strong>自分のカードだけ、見えません。</strong><p>相手のカードと宣言から、自分を含めた場の合計を予想します。</p></li>
      <li><strong>数字を上げるか、コヨーテ！</strong><p>最初は1以上の整数。次からは直前より大きい数字を宣言するか、「多すぎる！」と思ったらコヨーテで挑戦します。</p></li>
      <li><strong>同じ数字なら、宣言した人のセーフ。</strong><p>宣言が合計を超えていたら宣言者、合計以下なら挑戦者がライフを1失います。3回負けると脱落。最後の1人が優勝です。</p></li>
    </ol>
    <h3 className="font-bold mt-6 mb-3">4枚の特殊カード</h3>
    <div className="space-y-3">{COYOTE_CARD_GROUPS.filter(g => g.face.kind !== 'number').map(g => <p key={g.face.kind} className="cy-help-text"><strong className="cy-gold">{g.label}</strong> — {g.description}</p>)}</div>
    <details className="cy-rules-details mt-6"><summary>このアプリでの扱い</summary><div className="cy-help-text space-y-3 mt-3">
      <p>全員3ライフ、仮面カードなし。敗者が次の先手になり、脱落した場合は次の生存者が先手になります。</p>
      <p>計算順は「? の追加札 → 最大の正数1枚を0 → 合算 → ×2」。? で引いた特殊カードも発動します。正数がなければキツネは何もしません。合計が負でも0に丸めません。</p>
      <p>配札前に人数分の山札がなければ、山札と捨て札を混ぜ直します。ちょうど0枚なら続行。? の追加札が必要なときは、今の場を残し、過去の捨て札だけで補充します。</p>
      <p>使用済み一覧は現在の捨て札を表示します。夜が出たらラウンド後に全36枚を混ぜ直し、一覧もリセットします。</p>
      <p>脱落後も観戦できます。退出、または切断の猶予時間を過ぎると対戦全体が終了します。</p>
      <p>日本語版を基準とし、細部は上記のアプリ裁定を採用しています。<a className="underline" href="https://www.newgamesorder.jp/games/coyote" target="_blank" rel="noreferrer">原作の公式ページ・FAQ</a></p>
    </div></details>
  </CoyotePanel>;
}
