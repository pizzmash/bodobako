import type { GameDefinition, GameLogEntry } from '../../types/game.js';
import { coyoteCardFace, coyoteCardKey } from './cards.js';
import { continueCoyote, createCoyoteState, nextCoyotePlayer, resolveCoyoteChallenge } from './logic.js';
import type { CoyoteMove, CoyotePlayerView, CoyotePublicState, CoyoteState, CoyoteVisibleCard } from './types.js';

export function getCoyotePlayerView(state: CoyoteState, playerId: string): CoyotePlayerView {
  const known = state.playerIds.includes(playerId);
  const revealed = state.phase !== 'bidding';
  const hands: Record<string, CoyoteVisibleCard> = Object.fromEntries(Object.entries(state.hands).map(([id, card]) =>
    [id, known && (revealed || id !== playerId) ? coyoteCardFace(card) : { hidden: true }],
  ));
  const discardCounts: Record<string, number> = {};
  for (const card of state.discard) {
    const key = coyoteCardKey(card);
    discardCounts[key] = (discardCounts[key] ?? 0) + 1;
  }
  // Explicit allowlist: never spread the server state into a network response.
  return {
    rulesVersion: state.rulesVersion, phase: state.phase, revision: state.revision,
    roundNumber: state.roundNumber, playerIds: [...state.playerIds], lives: { ...state.lives },
    currentPlayerIndex: state.currentPlayerIndex, eliminatedPlayerIds: [...state.eliminatedPlayerIds],
    lastBid: state.lastBid ? { ...state.lastBid } : null, roundBids: state.roundBids.map(bid => ({ ...bid })),
    roundResult: known && state.roundResult ? structuredClone(state.roundResult) : null,
    winnerId: state.winnerId, shuffleCount: state.shuffleCount,
    hands, deckCount: state.deck.length, discardCount: state.discard.length, discardCounts,
  };
}
export function getCoyoteLogEntries(prev: CoyotePublicState, next: CoyotePublicState): GameLogEntry[] {
  const entries: GameLogEntry[] = [];
  if (prev.revision === next.revision) return entries;
  if (next.phase === 'bidding' && next.lastBid && next.roundBids.length > prev.roundBids.length) {
    entries.push({ playerId: next.lastBid.playerId, message: `「${next.lastBid.value}」と宣言`, tag: '宣言', tagColor: '#9b691b' });
  }
  if (prev.phase === 'bidding' && next.roundResult) {
    const r = next.roundResult;
    entries.push({ playerId: r.challengerId, message: `コヨーテ${r.success ? '成功' : '失敗'}！ 宣言${r.bid.value} / 合計${r.total}`, tag: '判定', tagColor: '#a93226' });
    entries.push({ playerId: r.loserId, message: r.livesAfter ? `ライフ −1（残り${r.livesAfter}）` : 'ライフ0、脱落', tag: 'ライフ' });
  }
  if (next.shuffleCount > prev.shuffleCount) entries.push({ playerId: next.playerIds[next.currentPlayerIndex], message: '山札を混ぜ直しました。使用済み枚数をリセット', tag: '山札' });
  if (next.roundNumber > prev.roundNumber) entries.push({ playerId: next.playerIds[next.currentPlayerIndex], message: `ラウンド${next.roundNumber}開始`, tag: '配札' });
  return entries;
}
export const coyoteDefinition: GameDefinition<CoyoteState, CoyoteMove> = {
  id: 'coyote', name: 'コヨーテ', description: '自分だけ見えない。数字を上げるか、見破るか。月夜のブラフカードゲーム', minPlayers: 2, maxPlayers: 10,
  createInitialState: playerIds => createCoyoteState(playerIds),
  parseMove(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const m = raw as Record<string, unknown>;
    if (!Number.isSafeInteger(m.expectedRevision) || (m.expectedRevision as number) < 0) return null;
    const expectedRevision = m.expectedRevision as number;
    if (m.type === 'bid' && Number.isSafeInteger(m.value) && (m.value as number) >= 1) return { type: 'bid', value: m.value as number, expectedRevision };
    if (m.type === 'challenge' || m.type === 'continue') return { type: m.type, expectedRevision };
    return null;
  },
  validateMove(state, move, playerId) {
    if (state.phase === 'finished' || state.revision !== move.expectedRevision || !state.playerIds.includes(playerId) || state.lives[playerId] <= 0 || state.playerIds[state.currentPlayerIndex] !== playerId) return false;
    if (move.type === 'continue') return state.phase === 'round_result';
    if (state.phase !== 'bidding') return false;
    if (move.type === 'challenge') return state.lastBid !== null && state.lastBid.playerId !== playerId;
    return move.type === 'bid' && Number.isSafeInteger(move.value) && move.value >= 1 && (state.lastBid === null || move.value > state.lastBid.value);
  },
  applyMove(state, move, playerId) {
    const next = structuredClone(state);
    next.revision++;
    if (move.type === 'bid') {
      next.lastBid = { playerId, value: move.value };
      next.roundBids.push(next.lastBid);
      next.currentPlayerIndex = nextCoyotePlayer(next, next.currentPlayerIndex);
    } else if (move.type === 'challenge') resolveCoyoteChallenge(next, playerId);
    else continueCoyote(next);
    return next;
  },
  getStatus: state => state.phase === 'finished' ? 'finished' : 'playing',
  getRanking: state => state.phase === 'finished' && state.winnerId ? [state.winnerId, ...state.eliminatedPlayerIds.slice().reverse()] : null,
  getCurrentPlayerId: state => state.playerIds[state.currentPlayerIndex],
  getPlayerView: getCoyotePlayerView,
  getLogEntries: getCoyoteLogEntries,
};
