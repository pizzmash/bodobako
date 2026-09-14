import type { CoyoteCard, CoyoteCardFace } from './types.js';

export const COYOTE_CARD_GROUPS: { face: CoyoteCardFace; count: number; label: string; description: string }[] = [
  ...([20, 15, 10, 5, 4, 3, 2, 1, 0, -5, -10] as const).map(value => ({
    face: { kind: 'number' as const, value },
    count: value === 20 || value === -10 ? 1 : value === 15 || value === -5 ? 2 : value === 10 || value === 0 ? 3 : 4,
    label: String(value), description: 'そのまま合計に加えます',
  })),
  { face: { kind: 'night' }, count: 1, label: '0 / 夜', description: '数値は0。ラウンド後に全36枚を混ぜ直します' },
  { face: { kind: 'double' }, count: 1, label: '×2', description: '最後に合計を2倍にします' },
  { face: { kind: 'fox' }, count: 1, label: 'MAX→0', description: '最大の正の数字1枚を0にします' },
  { face: { kind: 'cave' }, count: 1, label: '?', description: '判定時に山札から1枚追加。特殊効果も発動します' },
];
export function coyoteCardKey(card: CoyoteCardFace): string {
  return card.kind === 'number' ? String(card.value) : card.kind;
}
export function coyoteCardFace(card: CoyoteCardFace): CoyoteCardFace {
  return card.kind === 'number' ? { kind: 'number', value: card.value } : { kind: card.kind };
}
export function createCoyoteDeck(): CoyoteCard[] {
  return COYOTE_CARD_GROUPS.flatMap(({ face, count }) =>
    Array.from({ length: count }, (_, i) => ({ ...face, id: `${coyoteCardKey(face)}:${i}` })),
  );
}
