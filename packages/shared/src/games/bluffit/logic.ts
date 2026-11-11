import type { BluffitMove, BluffitState, BluffitView } from "./types.js";

const deck = () => Array.from({ length: 10 }, (_, i) => i + 1);
const sum = (cards: number[]) => cards.reduce((total, card) => total + card, 0);

function shuffled(cards: number[]) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function clockwise(ids: string[], first: number) {
  return [...ids.slice(first), ...ids.slice(0, first)];
}

export function createInitialState(playerIds: string[]): BluffitState {
  return {
    playerIds,
    order: clockwise(playerIds, Math.floor(Math.random() * playerIds.length)),
    hands: Object.fromEntries(playerIds.map((id) => [id, deck()])),
    piles: Object.fromEntries(playerIds.map((id) => [id, []])),
    market: shuffled(deck()).slice(0, playerIds.length),
    round: 1,
    phase: "bid",
    turn: 0,
    claims: {},
    pendingDuel: null,
    bids: {},
    duels: [],
    lastAwards: null,
  };
}

export function validateMove(s: BluffitState, m: BluffitMove, id: string) {
  if (s.round !== m.round || !s.order.includes(id)) return false;
  if (s.pendingDuel) return m.type === "reveal" && s.pendingDuel.attacker === id && s.phase === "claim";
  if (m.type === "bid") {
    const source = s.round === 11 ? s.piles[id] : s.hands[id];
    return s.phase === "bid" && s.bids[id] === undefined && source.includes(m.value);
  }
  if (s.phase !== "claim" || s.order[s.turn] !== id) return false;
  if (m.type === "take") return s.market.includes(m.value);
  return m.type === "challenge" && m.target !== id && Object.hasOwn(s.claims, m.target);
}

function settle(s: BluffitState) {
  let highest = 0;
  let first = s.order[0];
  for (const id of s.order) {
    if (s.round === 11) s.piles[id].splice(s.piles[id].indexOf(s.bids[id]), 1);
    const prize = s.claims[id];
    if (prize === undefined) continue;
    s.piles[id].push(prize);
    if (prize > highest) {
      highest = prize;
      first = id;
    }
  }
  s.market = s.round === 11 ? [] : shuffled(Object.values(s.bids));
  s.lastAwards = { round: s.round, prizes: s.claims };
  s.bids = {};
  s.claims = {};
  s.turn = 0;
  if (s.round === 11) {
    s.phase = "finished";
    return;
  }
  s.round++;
  s.order = clockwise(s.playerIds, s.playerIds.indexOf(first)).filter(
    (id) => s.round < 11 || s.piles[id].length >= 2,
  );
  s.phase = s.order.length ? "bid" : "finished";
}

export function applyMove(state: BluffitState, m: BluffitMove, id: string): BluffitState {
  const s = structuredClone(state);
  if (m.type === "challenge") {
    s.pendingDuel = { round: s.round, attacker: id, defender: m.target, prize: s.claims[m.target] };
    return s;
  }
  if (m.type === "bid") {
    s.bids[id] = m.value;
    if (s.round < 11) s.hands[id].splice(s.hands[id].indexOf(m.value), 1);
    if (s.order.every((p) => s.bids[p] !== undefined)) s.phase = "claim";
    return s;
  }
  if (m.type === "take") {
    s.market.splice(s.market.indexOf(m.value), 1);
    s.claims[id] = m.value;
  } else if (m.type === "reveal" && s.pendingDuel) {
    const duel = s.pendingDuel;
    const attack = s.bids[duel.attacker],
      defense = s.bids[duel.defender];
    const winner = attack >= defense ? duel.attacker : duel.defender;
    delete s.claims[duel.defender];
    s.claims[winner] = duel.prize;
    s.duels.push({ ...duel, attack, defense, winner });
    s.pendingDuel = null;
  }
  if (++s.turn === s.order.length) settle(s);
  return s;
}

export function getPlayerView(s: BluffitState, id: string): BluffitView {
  const { playerIds, order, round, phase, turn, market, claims } = s;
  return {
    playerIds,
    order,
    round,
    phase,
    turn,
    market,
    claims,
    pendingDuel: s.pendingDuel ?? null,
    lastAwards: s.lastAwards,
    hand: round === 11 ? (s.piles[id] ?? []) : (s.hands[id] ?? []),
    pile: s.piles[id] ?? [],
    bid: s.bids[id] ?? null,
    ready: Object.keys(s.bids),
    tops: Object.fromEntries(playerIds.map((p) => [p, s.piles[p].at(-1) ?? null])),
    scores: phase === "finished" ? Object.fromEntries(playerIds.map((p) => [p, sum(s.piles[p])])) : null,
    duels: s.duels.map(({ attack, defense, ...duel }) =>
      id === duel.attacker || id === duel.defender ? { ...duel, attack, defense } : duel,
    ),
  };
}

export function getRanking(s: BluffitState) {
  const sorted = [...s.playerIds].sort((a, b) => sum(s.piles[b]) - sum(s.piles[a]));
  return sum(s.piles[sorted[0]]) === sum(s.piles[sorted[sorted.length - 1]]) ? null : sorted;
}
