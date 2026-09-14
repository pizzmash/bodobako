import type { CoyoteCardFace } from '@bodobako/shared';
export const C = { bg: '#101827', paper: '#f4e7ce', gold: '#e8b86b', danger: '#a93226' } as const;
export const PLAYER_COLORS = ['#e8b86b', '#8dd8bd', '#a9bced', '#e9a89f', '#c8afe8', '#95cbd2', '#d8c88e', '#c6cbd4', '#eca8c0', '#a9cb9b'];
export function cardLabel(card: CoyoteCardFace): string {
  return card.kind === 'number' ? String(card.value) : ({ night: '0', double: '×2', fox: 'MAX→0', cave: '?' })[card.kind];
}
export function cardName(card: CoyoteCardFace): string {
  return card.kind === 'number' ? (card.value < 0 ? 'マイナス' : card.value === 0 ? 'ゼロ' : 'コヨーテ') : ({ night: '夜', double: '合計を2倍', fox: '最大の1枚を0に', cave: 'ほらあな' })[card.kind];
}
