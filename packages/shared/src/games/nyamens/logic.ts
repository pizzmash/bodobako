import type { NyaCard, NyaEventCard, NyaMensState, NyaMensTrack, NyaRole } from "./types.js";

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function getHandSize(playerCount: number): number {
  if (playerCount === 2) return 6;
  if (playerCount === 3) return 5;
  if (playerCount === 4) return 4;
  return 3;
}

export function getEventCardCount(playerCount: number): number {
  return playerCount === 2 ? 6 : 5;
}

/** 役職プール（余り1〜2枚は廃棄されアサシンがいない可能性がある） */
export function getRolePool(playerCount: number): NyaRole[] {
  if (playerCount === 2) return ["nyamens", "nyamens", "assassin"];
  if (playerCount === 3) return ["nyamens", "nyamens", "nyamens", "assassin"];
  if (playerCount === 4) return ["nyamens", "nyamens", "nyamens", "nyamens", "assassin", "assassin"];
  return ["nyamens", "nyamens", "nyamens", "nyamens", "nyamens", "assassin", "assassin"];
}

export function canPlaceOnUp(card: number, track: NyaMensTrack): boolean {
  if (track.up.length === 0) return true;
  return card > track.up[track.up.length - 1]!;
}

export function canPlaceOnDown(card: number, track: NyaMensTrack): boolean {
  if (track.down.length === 0) return true;
  return card < track.down[track.down.length - 1]!;
}

export function canPlaceAnywhere(card: number, track: NyaMensTrack): boolean {
  return (
    canPlaceOnUp(card, track) ||
    canPlaceOnDown(card, track) ||
    track.recycleBox === null
  );
}

export function isRepairComplete(track: NyaMensTrack, burnedCards: number[]): boolean {
  const totalPlaced = track.up.length + track.down.length;
  return totalPlaced === 30 - burnedCards.length && track.recycleBox === null;
}

/**
 * 全プレイヤーの手札を handSize まで補充する。
 * イベントカードを引いた場合はキューに追加し、もう1枚補充（代替ドロー）。
 */
export function replenishHands(state: NyaMensState): NyaMensState {
  const pile = [...state.drawPile];
  const hands: Record<string, number[]> = {};
  const eventQueue = [...state.eventQueue];

  for (const playerId of state.playerOrder) {
    const hand = [...(state.hands[playerId] ?? [])];
    while (hand.length < state.handSize && pile.length > 0) {
      const card = pile.shift() as NyaCard;
      if (typeof card === "number") {
        hand.push(card);
      } else {
        // イベントカード → キューに追加し代替ドロー（whileが継続する）
        eventQueue.push(card as NyaEventCard);
      }
    }
    hands[playerId] = hand;
  }

  return { ...state, hands, drawPile: pile, eventQueue };
}

/**
 * イベントキューの先頭を処理し、次フェーズに遷移する。
 * キューが空になったら当番をローテートして dice-roll（or card-selection）へ。
 * この関数はひとりの当番ターン中のイベントをすべて処理し終えてから当番を交代する。
 */
export function processNextEvent(state: NyaMensState): NyaMensState {
  if (state.eventQueue.length === 0) {
    // 全員の手札が空かつ山札も空 → カードが尽きてニャーメンズの勝利
    const totalHandCards = Object.values(state.hands).reduce((s, h) => s + h.length, 0);
    if (totalHandCards === 0 && state.drawPile.length === 0) {
      return {
        ...state,
        phase: "finished",
        result: { winner: "nyamens", reason: "repair-complete" },
      };
    }

    // イベントターン完了 → draw-cards フェーズで補充（イベントカードが見えるよう通常経路を通す）
    if (state.eventTurnActive) {
      return enterDrawPhase({ ...state, eventTurnActive: false });
    }

    // すべてのイベントを処理 → 当番をローテート
    const nextDutyIndex = (state.repairDutyIndex + 1) % state.playerOrder.length;
    const base: NyaMensState = {
      ...state,
      repairDutyIndex: nextDutyIndex,
      diceResult: null,
      selectedCards: {},
      revealedCards: null,
      readyPlayers: [],
      drawQueue: [],
      drawnCard: undefined,
    };
    if (state.okamiActive) {
      // オオカミ発動中はサイコロをスキップして card-selection へ
      // okamiActive は confirm-submission 時にクリアする
      return { ...base, phase: "card-selection" };
    }
    return { ...base, phase: "dice-roll" };
  }


  const [nextEvent, ...rest] = state.eventQueue as [NyaEventCard, ...NyaEventCard[]];
  const reduced = { ...state, eventQueue: rest };

  if (nextEvent === "okami") {
    // 既にokamiActiveなら次のイベントへ（多重発動防止）
    if (state.okamiActive) {
      return processNextEvent(reduced);
    }
    // okamiActive: true & card-selectionへ即遷移
    return { ...reduced, okamiActive: true, phase: "card-selection" };
  }

  if (nextEvent === "shirokuma") {
    return { ...reduced, phase: "event-shirokuma", shirokuma: {} };
  }

  if (nextEvent === "tuning") {
    const dutyPlayer = reduced.playerOrder[reduced.repairDutyIndex]!;
    const hand = reduced.hands[dutyPlayer] ?? [];
    const { track } = reduced;
    // UP or DOWN にスワップ可能なカードがあるか確認
    const canSwapUp =
      track.up.length > 0 &&
      hand.some((c) => track.up.length === 1 || c > track.up[track.up.length - 2]!);
    const canSwapDown =
      track.down.length > 0 &&
      hand.some((c) => track.down.length === 1 || c < track.down[track.down.length - 2]!);

    if (!canSwapUp && !canSwapDown) {
      // チューニング実行不可 → 修理失敗
      return { ...reduced, phase: "vote", votes: {} };
    }
    return { ...reduced, phase: "event-tuning", tuning: {} };
  }

  // 未知のイベントはスキップ
  return processNextEvent(reduced);
}

/**
 * 修理担当の手札に山札から数字カードを1枚引いて追加する。
 * イベントカードを引いた場合はキューに積んで引き直す（whileで継続）。
 * 山札が尽きた場合はそのまま返す。
 */
export function drawOneCard(state: NyaMensState, playerId: string): NyaMensState {
  const pile = [...state.drawPile];
  const eventQueue = [...state.eventQueue];
  const hand = [...(state.hands[playerId] ?? [])];

  while (pile.length > 0) {
    const card = pile.shift() as NyaCard;
    if (typeof card === "number") {
      hand.push(card);
      return {
        ...state,
        drawPile: pile,
        eventQueue,
        hands: { ...state.hands, [playerId]: hand },
      };
    } else {
      eventQueue.push(card as NyaEventCard);
    }
  }
  // 山札が尽きた場合はそのまま返す
  return { ...state, drawPile: pile, eventQueue };
}

/**
 * 手札補充が必要なプレイヤーがいれば draw-cards フェーズに遷移する。
 * 補充不要（全員が handSize 以上）または山札が空の場合は直接 processNextEvent を呼ぶ。
 */
export function enterDrawPhase(state: NyaMensState): NyaMensState {
  const needsDraw = state.playerOrder.filter(
    (pid) => (state.hands[pid] ?? []).length < state.handSize
  );
  if (needsDraw.length === 0 || state.drawPile.length === 0) {
    return enterEventTurn(state);
  }
  return { ...state, phase: "draw-cards", drawQueue: needsDraw, drawnCard: null, lastDrawer: undefined };
}

/**
 * draw-cards フェーズ完了後、または補充不要時に呼ばれる。
 * 当番をローテートし、イベントキューがあればイベント処理ターンへ、
 * なければ通常の dice-roll（または okamiActive なら card-selection）へ遷移する。
 */
export function enterEventTurn(state: NyaMensState): NyaMensState {
  const nextDutyIndex = (state.repairDutyIndex + 1) % state.playerOrder.length;
  const base: NyaMensState = {
    ...state,
    repairDutyIndex: nextDutyIndex,
    eventTurnActive: false,
    diceResult: null,
    selectedCards: {},
    revealedCards: null,
    readyPlayers: [],
    drawQueue: [],
    drawnCard: undefined,
    lastDrawer: undefined,
  };

  // repair-complete チェック: 手札ゼロ + 山札ゼロ → finished
  const totalHandCards = Object.values(base.hands).reduce((s, h) => s + h.length, 0);
  if (totalHandCards === 0 && base.drawPile.length === 0) {
    return {
      ...base,
      phase: "finished",
      result: { winner: "nyamens", reason: "repair-complete" },
    };
  }

  // イベントなし → 通常ターン
  if (base.eventQueue.length === 0) {
    if (base.okamiActive) return { ...base, phase: "card-selection" };
    return { ...base, phase: "dice-roll" };
  }

  // イベントあり → イベント処理ターン（eventTurnActive=true を付与して processNextEvent）
  return processNextEvent({ ...base, eventTurnActive: true });
}

export function checkVoteResult(state: NyaMensState): NyaMensState {
  const votes = state.votes!;
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    counts[target] = (counts[target] ?? 0) + 1;
  }

  let maxCount = 0;
  let maxTarget: string | null = null;
  let isTied = false;

  for (const [target, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxTarget = target;
      isTied = false;
    } else if (count === maxCount) {
      isTied = true;
    }
  }

  const hasAssassin = Object.values(state.roles).some((r) => r === "assassin");
  const arrestTarget = isTied || maxTarget === "none" || maxTarget === null ? null : maxTarget;

  if (!arrestTarget) {
    // 逮捕なし
    const winner: "nyamens" | "assassin" = hasAssassin ? "assassin" : "nyamens";
    const reason = hasAssassin ? "missed-assassin" : "no-assassin";
    return { ...state, phase: "finished", result: { winner, reason } };
  }

  if (state.roles[arrestTarget] === "assassin") {
    return {
      ...state,
      phase: "finished",
      result: { winner: "nyamens", reason: "correct-arrest" },
    };
  } else {
    return {
      ...state,
      phase: "finished",
      result: { winner: "assassin", reason: "wrong-arrest" },
    };
  }
}
