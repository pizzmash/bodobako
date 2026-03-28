import type { GameDefinition, GameLogEntry } from "../../types/game.js";
import {
  canPlaceAnywhere,
  canPlaceOnDown,
  canPlaceOnUp,
  checkVoteResult,
  enterDrawPhase,
  enterEventTurn,
  getEventCardCount,
  getHandSize,
  getRolePool,
  isRepairComplete,
  processNextEvent,
  shuffleArray,
} from "./logic.js";
import type { NyaCard, NyaMensMove, NyaMensPlayerView, NyaMensState, NyaRole } from "./types.js";

export const nyaMensDefinition: GameDefinition<NyaMensState, NyaMensMove> = {
  id: "nyamens",
  name: "ニャーメンズ",
  description: "アサシンが潜む協力修理ゲーム。全30枚のカードを順番に並べ修理を完成させよ！",
  minPlayers: 2,
  maxPlayers: 5,

  createInitialState(playerIds: string[]): NyaMensState {
    const playerCount = playerIds.length;
    const handSize = getHandSize(playerCount);
    const eventCardCount = getEventCardCount(playerCount);

    // 役職割り当て
    const rolePool = shuffleArray(getRolePool(playerCount));
    const roles: Record<string, NyaRole> = {};
    for (let i = 0; i < playerIds.length; i++) {
      roles[playerIds[i]!] = rolePool[i]!;
    }

    // 数字カード 1〜30 をシャッフルして手札配布
    const numberedCards = shuffleArray(Array.from({ length: 30 }, (_, i) => i + 1));
    const hands: Record<string, number[]> = {};
    let cardIdx = 0;
    for (const pid of playerIds) {
      hands[pid] = numberedCards.slice(cardIdx, cardIdx + handSize);
      cardIdx += handSize;
    }

    // イベントカードを必要枚数だけ選択
    const allEvents = [
      "okami", "okami", "okami",
      "shirokuma", "shirokuma",
      "tuning", "tuning",
    ] as const;
    const selectedEvents = shuffleArray([...allEvents]).slice(0, eventCardCount);

    // 残り数字カード + イベントカード → シャッフルしてドロー山
    const remainingNumbers = numberedCards.slice(cardIdx);
    const drawPile = shuffleArray([...remainingNumbers, ...selectedEvents]);

    return {
      phase: "role-reveal",
      playerOrder: playerIds,
      handSize,
      roles,
      hands,
      drawPile,
      burnedCards: [],
      track: { up: [], down: [], recycleBox: null },
      repairDutyIndex: 0,
      diceResult: null,
      okamiActive: false,
      selectedCards: {},
      revealedCards: null,
      eventQueue: [],
      readyPlayers: [],
      votes: null,
    };
  },

  parseMove(raw: unknown): NyaMensMove | null {
    if (typeof raw !== "object" || raw === null) return null;
    const m = raw as Record<string, unknown>;
    if (typeof m.type !== "string") return null;

    switch (m.type) {
      case "role-ready":
        return { type: "role-ready" };
      case "roll-dice":
        return { type: "roll-dice" };
      case "select-cards": {
        if (!Array.isArray(m.cards)) return null;
        if (!m.cards.every((c) => typeof c === "number" && Number.isInteger(c))) return null;
        return { type: "select-cards", cards: m.cards as number[] };
      }
      case "confirm-submission":
        return { type: "confirm-submission" };
      case "place-card": {
        if (typeof m.card !== "number" || !Number.isInteger(m.card)) return null;
        if (m.destination !== "up" && m.destination !== "down" && m.destination !== "recycle") return null;
        return { type: "place-card", card: m.card, destination: m.destination };
      }
      case "shirokuma-target": {
        if (typeof m.playerId !== "string") return null;
        return { type: "shirokuma-target", playerId: m.playerId };
      }
      case "tuning-swap": {
        if (m.trackChoice !== "up" && m.trackChoice !== "down") return null;
        if (typeof m.replacementCard !== "number" || !Number.isInteger(m.replacementCard)) return null;
        return {
          type: "tuning-swap",
          trackChoice: m.trackChoice,
          replacementCard: m.replacementCard,
        };
      }
      case "draw-card":
        return { type: "draw-card" };
      case "vote": {
        if (typeof m.target !== "string") return null;
        return { type: "vote", target: m.target as string | "none" };
      }
      default:
        return null;
    }
  },

  validateMove(state: NyaMensState, move: NyaMensMove, playerId: string): boolean {
    if (!state.playerOrder.includes(playerId)) return false;

    switch (state.phase) {
      case "role-reveal": {
        if (move.type !== "role-ready") return false;
        return !state.readyPlayers.includes(playerId);
      }

      case "dice-roll": {
        if (move.type !== "roll-dice") return false;
        return playerId === state.playerOrder[state.repairDutyIndex];
      }

      case "card-selection": {
        if (move.type === "select-cards") {
          const hand = state.hands[playerId] ?? [];
          const { cards } = move;
          if (new Set(cards).size !== cards.length) return false;
          return cards.every((c) => hand.includes(c));
        }
        if (move.type === "confirm-submission") {
          if (playerId !== state.playerOrder[state.repairDutyIndex]) return false;
          if (state.okamiActive) {
            return state.playerOrder.every(
              (pid) => (state.selectedCards[pid]?.length ?? 0) === 1
            );
          }
          const total = Object.values(state.selectedCards).reduce((s, c) => s + c.length, 0);
          // 全手札合計がサイコロ結果より少ない場合は、全手札を選択すればOK
          const totalHandCards = Object.values(state.hands).reduce((s, h) => s + h.length, 0);
          const effectiveRequired = Math.min(state.diceResult!, totalHandCards);
          return total === effectiveRequired;
        }
        return false;
      }

      case "repair": {
        if (move.type !== "place-card") return false;
        if (playerId !== state.playerOrder[state.repairDutyIndex]) return false;
        if (!state.revealedCards?.includes(move.card)) return false;
        const { track } = state;
        switch (move.destination) {
          case "up":
            return canPlaceOnUp(move.card, track);
          case "down":
            return canPlaceOnDown(move.card, track);
          case "recycle":
            return track.recycleBox === null;
          default:
            return false;
        }
      }

      case "event-shirokuma": {
        if (move.type !== "shirokuma-target") return false;
        if (playerId !== state.playerOrder[state.repairDutyIndex]) return false;
        return state.playerOrder.includes(move.playerId);
      }

      case "event-tuning": {
        if (move.type !== "tuning-swap") return false;
        if (playerId !== state.playerOrder[state.repairDutyIndex]) return false;
        const { trackChoice, replacementCard } = move;
        const { track } = state;
        const hand = state.hands[playerId] ?? [];
        if (!hand.includes(replacementCard)) return false;
        if (trackChoice === "up") {
          if (track.up.length === 0) return false;
          if (track.up.length > 1 && replacementCard <= track.up[track.up.length - 2]!) return false;
        } else {
          if (track.down.length === 0) return false;
          if (track.down.length > 1 && replacementCard >= track.down[track.down.length - 2]!) return false;
        }
        return true;
      }

      case "draw-cards": {
        if (move.type !== "draw-card") return false;
        const drawQueue = state.drawQueue ?? [];
        // ACK待ち: キューが空で drawnCard があれば lastDrawer からのみ許可（オーバーレイ閉幕ACK）
        if (drawQueue.length === 0) {
          return state.drawnCard != null && state.lastDrawer === playerId;
        }
        return drawQueue[0] === playerId;
      }

      case "vote": {
        if (move.type !== "vote") return false;
        if (state.votes?.[playerId] !== undefined) return false;
        if (move.target !== "none" && !state.playerOrder.includes(move.target)) return false;
        return true;
      }

      default:
        return false;
    }
  },

  applyMove(state: NyaMensState, move: NyaMensMove, playerId: string): NyaMensState {
    switch (state.phase) {
      case "role-reveal": {
        if (move.type !== "role-ready") return state;
        const readyPlayers = [...state.readyPlayers, playerId];
        if (readyPlayers.length === state.playerOrder.length) {
          return { ...state, readyPlayers, phase: "dice-roll" };
        }
        return { ...state, readyPlayers };
      }

      case "dice-roll": {
        if (move.type !== "roll-dice") return state;
        const roll = Math.floor(Math.random() * 6) + 1;

        if (roll === 1) {
          // 焼却: リサイクルボックスのカードを廃棄
          const dutyPlayer1 = state.playerOrder[state.repairDutyIndex]!;
          const newBurnedCards = [...state.burnedCards];
          let newTrack = state.track;
          if (state.track.recycleBox !== null) {
            newBurnedCards.push(state.track.recycleBox);
            newTrack = { ...state.track, recycleBox: null };
          }
          const afterBurn: NyaMensState = {
            ...state,
            diceResult: 1,
            track: newTrack,
            burnedCards: newBurnedCards,
          };
          // リサイクルボックスが空だった場合 → 当番プレイヤーを補充キューに強制追加
          if (state.track.recycleBox === null) {
            const needsDraw = afterBurn.playerOrder.filter(
              (pid) => pid === dutyPlayer1 || (afterBurn.hands[pid] ?? []).length < afterBurn.handSize
            );
            if (needsDraw.length === 0 || afterBurn.drawPile.length === 0) {
              return { ...enterEventTurn(afterBurn), diceResult: 1 };
            }
            return { ...afterBurn, phase: "draw-cards", drawQueue: needsDraw, drawnCard: null, lastDrawer: undefined, diceResult: 1 };
          }
          // diceResult: 1 をクライアントに届けるため常に保持
          return { ...enterDrawPhase(afterBurn), diceResult: 1 };
        }

        if (roll === 6) {
          // リサイクル: リサイクルボックスのカードを当番の手札に
          const dutyPlayer = state.playerOrder[state.repairDutyIndex]!;
          const newHands = { ...state.hands };
          let newTrack = state.track;
          if (state.track.recycleBox !== null) {
            newHands[dutyPlayer] = [...(newHands[dutyPlayer] ?? []), state.track.recycleBox];
            newTrack = { ...state.track, recycleBox: null };
          }
          const afterRecycle: NyaMensState = {
            ...state,
            diceResult: 6,
            track: newTrack,
            hands: newHands,
          };
          // リサイクルボックスが空だった場合 → 当番プレイヤーを補充キューに強制追加
          if (state.track.recycleBox === null) {
            const needsDraw = afterRecycle.playerOrder.filter(
              (pid) => pid === dutyPlayer || (afterRecycle.hands[pid] ?? []).length < afterRecycle.handSize
            );
            if (needsDraw.length === 0 || afterRecycle.drawPile.length === 0) {
              return { ...enterEventTurn(afterRecycle), diceResult: 6 };
            }
            return { ...afterRecycle, phase: "draw-cards", drawQueue: needsDraw, drawnCard: null, lastDrawer: undefined, diceResult: 6 };
          }
          // diceResult: 6 をクライアントに届けるため常に保持
          return { ...enterDrawPhase(afterRecycle), diceResult: 6 };
        }

        // 通常ロール (2〜5)
        return {
          ...state,
          diceResult: roll,
          selectedCards: {},
          phase: "card-selection",
        };
      }

      case "card-selection": {
        if (move.type === "select-cards") {
          return {
            ...state,
            selectedCards: { ...state.selectedCards, [playerId]: move.cards },
          };
        }
        if (move.type === "confirm-submission") {
          // 全選択カードを集めてシャッフル
          const allCards = Object.values(state.selectedCards).flat();
          const shuffled = shuffleArray(allCards);
          // 各プレイヤーの手札から選択カードを削除
          const newHands = { ...state.hands };
          for (const [pid, cards] of Object.entries(state.selectedCards)) {
            let hand = [...(newHands[pid] ?? [])];
            for (const card of cards) {
              const idx = hand.indexOf(card);
              if (idx >= 0) hand.splice(idx, 1);
            }
            newHands[pid] = hand;
          }
          // リペア開始時点で全カードが置けない場合 → 即座に vote フェーズへ（フリーズ防止）
          const hasAnyPlaceable = shuffled.some((c) => canPlaceAnywhere(c, state.track));
          if (!hasAnyPlaceable) {
            return {
              ...state,
              hands: newHands,
              revealedCards: shuffled,
              selectedCards: {},
              okamiActive: false,
              phase: "vote",
              votes: {},
            };
          }
          return {
            ...state,
            hands: newHands,
            revealedCards: shuffled,
            selectedCards: {},
            phase: "repair",
            okamiActive: false,
          };
        }
        return state;
      }

      case "repair": {
        if (move.type !== "place-card") return state;

        // 全公開カードが置けない場合（フリーズ防止）→ 即 vote
        const allStuck = state.revealedCards?.every(
          (c) =>
            !canPlaceOnUp(c, state.track) &&
            !canPlaceOnDown(c, state.track) &&
            state.track.recycleBox !== null
        );
        if (allStuck) {
          return { ...state, phase: "vote", votes: {} };
        }

        const { card, destination } = move;
        const newRevealed = state.revealedCards!.filter((c) => c !== card);
        let newTrack = { ...state.track };

        if (destination === "up") {
          newTrack.up = [...newTrack.up, card];
        } else if (destination === "down") {
          newTrack.down = [...newTrack.down, card];
        } else {
          newTrack.recycleBox = card;
        }

        // 残りカードの中に置けない（= 修理失敗）カードがあるか確認
        if (newRevealed.length > 0) {
          const hasUnplaceable = newRevealed.some(
            (c) =>
              !canPlaceOnUp(c, newTrack) &&
              !canPlaceOnDown(c, newTrack) &&
              newTrack.recycleBox !== null
          );
          if (hasUnplaceable) {
            return {
              ...state,
              track: newTrack,
              revealedCards: newRevealed,
              phase: "vote",
              votes: {},
            };
          }
          return { ...state, track: newTrack, revealedCards: newRevealed };
        }

        // 全カード配置完了 → 修理成功判定
        if (isRepairComplete(newTrack, state.burnedCards)) {
          return {
            ...state,
            track: newTrack,
            revealedCards: null,
            phase: "finished",
            result: { winner: "nyamens", reason: "repair-complete" },
          };
        }

        // 修理完了（勝利ではない）
        const nextState = { ...state, track: newTrack, revealedCards: null };
        // イベントターン中は手札補充せず次イベントへ、通常は補充フェーズへ
        return state.eventTurnActive
          ? processNextEvent(nextState)
          : enterDrawPhase(nextState);
      }

      case "draw-cards": {
        if (move.type !== "draw-card") return state;
        const drawQueue = state.drawQueue ?? [];

        // ACK待ち状態（最後のカードを引いた後、オーバーレイ閉幕まで待機） → 次フェーズへ
        if (drawQueue.length === 0) {
          return enterEventTurn({ ...state, drawQueue: [], drawnCard: undefined, lastDrawer: undefined });
        }

        const drawer = drawQueue[0]!;
        if (playerId !== drawer) return state;

        // 山札が空 → このプレイヤーの補充をスキップして次へ
        if (state.drawPile.length === 0) {
          const newDrawQueue = drawQueue.slice(1);
          if (newDrawQueue.length === 0) {
            return enterEventTurn({ ...state, drawQueue: [], drawnCard: undefined, lastDrawer: undefined });
          }
          // drawnCard・lastDrawer をクリアしないと前回引いたイベントカードが再表示されてしまう
          return { ...state, drawQueue: newDrawQueue, drawnCard: undefined, lastDrawer: undefined };
        }

        const pile = [...state.drawPile];
        const drawn = pile.shift() as NyaCard;
        let newHands = { ...state.hands };
        let newEventQueue = [...state.eventQueue];
        let newDrawQueue = [...drawQueue];

        if (typeof drawn === "number") {
          newHands[drawer] = [...(newHands[drawer] ?? []), drawn];
          if ((newHands[drawer]?.length ?? 0) >= state.handSize) {
            newDrawQueue = newDrawQueue.slice(1); // 補充完了 → 次のプレイヤーへ
          }
        } else {
          // イベントカード → キューに追加し手番継続
          newEventQueue = [...newEventQueue, drawn];
        }

        // 常に lastDrawer を更新。キューが空になった場合は ACK待ち（processNextEvent を呼ばない）
        return {
          ...state,
          hands: newHands,
          drawPile: pile,
          eventQueue: newEventQueue,
          drawQueue: newDrawQueue,
          drawnCard: drawn,
          lastDrawer: drawer,
        };
      }

      case "event-shirokuma": {
        if (move.type !== "shirokuma-target") return state;
        const targetHand = state.hands[move.playerId] ?? [];
        if (targetHand.length === 0) {
          // 手札が空で実行不可 → 修理失敗
          return { ...state, phase: "vote", votes: {} };
        }
        const randomIndex = Math.floor(Math.random() * targetHand.length);
        const pickedCard = targetHand[randomIndex]!;
        const newTargetHand = targetHand.filter((_, i) => i !== randomIndex);
        const newHands = { ...state.hands, [move.playerId]: newTargetHand };
        // 選ばれたカードが置けない場合 → 修理失敗 → 投票フェーズへ
        if (!canPlaceAnywhere(pickedCard, state.track)) {
          return { ...state, hands: newHands, revealedCards: [pickedCard], phase: "vote", votes: {} };
        }
        return {
          ...state,
          hands: newHands,
          revealedCards: [pickedCard],
          shirokuma: undefined,
          phase: "repair",
        };
      }

      case "event-tuning": {
        if (move.type !== "tuning-swap") return state;
        const { trackChoice, replacementCard } = move;
        const dutyPlayer = state.playerOrder[state.repairDutyIndex]!;
        const newTrack = { ...state.track };

        let returnedCard: number;
        if (trackChoice === "up") {
          returnedCard = newTrack.up[newTrack.up.length - 1]!;
          newTrack.up = [...newTrack.up.slice(0, -1), replacementCard];
        } else {
          returnedCard = newTrack.down[newTrack.down.length - 1]!;
          newTrack.down = [...newTrack.down.slice(0, -1), replacementCard];
        }

        // 当番の手札: replacementCard を消費し returnedCard を追加
        const dutyHand = [...(state.hands[dutyPlayer] ?? [])];
        const replIdx = dutyHand.indexOf(replacementCard);
        if (replIdx >= 0) dutyHand.splice(replIdx, 1);
        dutyHand.push(returnedCard);

        const newState: NyaMensState = {
          ...state,
          track: newTrack,
          hands: { ...state.hands, [dutyPlayer]: dutyHand },
          tuning: undefined,
        };
        return processNextEvent(newState);
      }

      case "vote": {
        if (move.type !== "vote") return state;
        const newVotes = { ...state.votes!, [playerId]: move.target };
        const voteState = { ...state, votes: newVotes };
        if (state.playerOrder.every((pid) => newVotes[pid] !== undefined)) {
          return checkVoteResult(voteState);
        }
        return voteState;
      }

      default:
        return state;
    }
  },

  getStatus(state: NyaMensState) {
    return state.phase === "finished" ? "finished" : "playing";
  },

  getRanking(state: NyaMensState): string[] | null {
    if (!state.result) return null;
    const nyamenIds = state.playerOrder.filter((id) => state.roles[id] === "nyamens");
    const assassinIds = state.playerOrder.filter((id) => state.roles[id] === "assassin");
    if (state.result.winner === "nyamens") {
      return [...nyamenIds, ...assassinIds];
    }
    return [...assassinIds, ...nyamenIds];
  },

  getLogEntries(prevState: NyaMensState, newState: NyaMensState): GameLogEntry[] {
    // クライアントサイドでは NyaMensPlayerView が渡される
    const prev = prevState as unknown as NyaMensPlayerView;
    const next = newState as unknown as NyaMensPlayerView;
    const entries: GameLogEntry[] = [];

    // ロール確認完了
    if (prev.phase === "role-reveal" && next.phase === "dice-roll") {
      entries.push({ playerId: next.playerOrder[0]!, message: "全員が役職を確認しました" });
      return entries;
    }

    // サイコロ（1/6 は補充不要時に dice-roll→dice-roll 遷移でも diceResult が保持される）
    if (prev.phase === "dice-roll" && next.diceResult != null) {
      const pid = prev.playerOrder[prev.repairDutyIndex]!;
      let tag: string | undefined;
      let tagColor: string | undefined;
      if (next.diceResult === 1) { tag = "焼却"; tagColor = "#dc2626"; }
      if (next.diceResult === 6) { tag = "リサイクル"; tagColor = "#16a34a"; }
      entries.push({ playerId: pid, message: `「${next.diceResult}」が出ました`, tag, tagColor });
    }

    // 焼却（burnedCards 増加）
    if (next.burnedCards.length > prev.burnedCards.length) {
      const pid = prev.playerOrder[prev.repairDutyIndex]!;
      entries.push({ playerId: pid, message: "カードが廃棄されました" });
    }

    // カードを引いた
    if (next.drawnCard != null && next.drawnCard !== prev.drawnCard && next.lastDrawer) {
      if (typeof next.drawnCard === "number") {
        entries.push({ playerId: next.lastDrawer, message: "カードを引きました" });
      } else {
        entries.push({ playerId: next.lastDrawer, message: `「${next.drawnCard}」イベントが発生しました` });
      }
    }

    // 投票完了 → 次フェーズ
    if (prev.phase === "vote" && next.phase !== "vote") {
      if (next.phase === "finished") {
        // ゲーム終了は下のブロックで処理
      } else {
        entries.push({ playerId: next.playerOrder[0]!, message: "修理失敗... 次のターンへ" });
      }
    }

    // ゲーム終了
    if (next.phase === "finished" && prev.phase !== "finished") {
      if (next.result?.winner === "nyamens") {
        entries.push({ playerId: next.playerOrder[0]!, message: "ニャーメンズの勝利！修理が完了しました！", tag: "修理完了", tagColor: "#16a34a" });
      } else if (next.result?.winner === "assassin") {
        entries.push({ playerId: next.playerOrder[0]!, message: "アサシンの勝利！修理を妨害しました", tag: "妨害成功", tagColor: "#dc2626" });
      }
    }

    return entries;
  },

  getCurrentPlayerId(state: NyaMensState): string {
    const dutyPlayer = state.playerOrder[state.repairDutyIndex] ?? state.playerOrder[0]!;
    switch (state.phase) {
      // 全員同時入力フェーズ：特定の手番プレイヤーなし
      case "role-reveal":
      case "card-selection":
      case "vote":
        return "";
      case "draw-cards":
        return state.drawQueue?.[0] ?? dutyPlayer;
      default:
        return dutyPlayer;
    }
  },

  getPlayerView(state: NyaMensState, playerId: string): NyaMensPlayerView {
    const myRole = state.roles[playerId] ?? "nyamens";
    const isFinished = state.phase === "finished";

    let assassinIds: string[] = [];
    let revealedRoles: Record<string, NyaRole> | undefined;

    if (isFinished) {
      revealedRoles = { ...state.roles };
      assassinIds = state.playerOrder.filter((id) => state.roles[id] === "assassin");
    } else if (myRole === "assassin") {
      assassinIds = state.playerOrder.filter(
        (id) => state.roles[id] === "assassin" && id !== playerId
      );
    }

    // 最後に引いたプレイヤーで判定（キューが進んでも正しく自分のカードと判定できる)
    const isCurrentDrawer =
      state.phase === "draw-cards" && state.drawnCard != null && state.lastDrawer === playerId;
    const drawnCard: NyaCard | null =
      state.drawnCard == null
        ? null
        : isCurrentDrawer
          ? state.drawnCard // 自分が引いた → 実際のカード
          : typeof state.drawnCard !== "number"
            ? state.drawnCard // イベントカード → 全員に公開
            : null; // 他人の数字カード → 非公開

    return {
      phase: state.phase,
      playerOrder: state.playerOrder,
      handSize: state.handSize,
      myRole,
      assassinIds,
      myHand: state.hands[playerId] ?? [],
      otherHandCounts: Object.fromEntries(
        state.playerOrder
          .filter((id) => id !== playerId)
          .map((id) => [id, (state.hands[id] ?? []).length])
      ),
      drawPileCount: state.drawPile.length,
      burnedCards: state.burnedCards,
      track: state.track,
      repairDutyIndex: state.repairDutyIndex,
      diceResult: state.diceResult,
      okamiActive: state.okamiActive,
      mySelectedCards: state.selectedCards[playerId] ?? [],
      totalSelectedCount: Object.values(state.selectedCards).reduce(
        (s, c) => s + c.length,
        0
      ),
      otherSelectedCounts: Object.fromEntries(
        state.playerOrder
          .filter((id) => id !== playerId)
          .map((id) => [id, (state.selectedCards[id] ?? []).length])
      ),
      revealedCards: state.revealedCards,
      eventQueue: state.eventQueue,
      readyPlayers: state.readyPlayers,
      shirokuma: state.shirokuma,
      tuning: state.tuning,
      drawQueue: state.drawQueue ?? [],
      drawnCard,
      lastDrawer: state.lastDrawer,
      eventTurnActive: state.eventTurnActive ?? false,
      votes: state.votes,
      result: state.result,
      revealedRoles,
    };
  },
};
