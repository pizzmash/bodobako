import type { GameDefinition } from "../../types/game.js";
import type {
  CitychaseState,
  CitychaseMove,
  CitychasePlayerView,
} from "./types.js";
import {
  HELICOPTER_COUNT,
  MAX_ROUNDS,
  posKey,
  isValidBuildingPos,
  isValidIntersectionPos,
  isOccupiedIntersection,
  isAdjacentIntersection,
  isAdjacentBuilding,
  isBuildingSurroundingIntersection,
  getValidCriminalMoves,
  canCriminalMove,
  assignHelicopters,
  getHelicoptersForPlayer,
  advancePolice,
  createRevealedTrace,
  isSamePos,
} from "./logic.js";

/** criminal-turnに遷移する際、終了条件を満たしていればfinished/winningSideを設定 */
function finalizeCriminalTurn(s: CitychaseState): CitychaseState {
  if (s.round >= MAX_ROUNDS) {
    return { ...s, finished: true, winningSide: "criminal" };
  }
  if (!canCriminalMove(s)) {
    return { ...s, finished: true, winningSide: "police" };
  }
  return s;
}

export const citychaseDefinition: GameDefinition<
  CitychaseState,
  CitychaseMove
> = {
  id: "citychase",
  name: "シティチェイス",
  description:
    "犯人と警察に分かれて、5×5のビル群を舞台に追跡劇を繰り広げる非対称対戦ゲーム",
  minPlayers: 2,
  maxPlayers: 4,

  createInitialState(playerIds: string[], hostId?: string): CitychaseState {
    return {
      playerIds,
      phase: "role-select",
      round: 1,
      criminalId: null,
      policeIds: [],
      hostId: hostId ?? playerIds[0],
      helicopters: Array(HELICOPTER_COUNT).fill(null),
      helicopterAssignments: [],
      criminalPos: null,
      traces: {},
      revealedTraces: [],
      searchedEmpty: [],
      lastSearchResult: null,
      currentPoliceIndex: 0,
      currentHelicopterIndex: 0,
      finished: false,
      winningSide: null,
    };
  },

  validateMove(
    state: CitychaseState,
    move: CitychaseMove,
    playerId: string
  ): boolean {
    switch (state.phase) {
      case "role-select": {
        if (move.type !== "assign-criminal") return false;
        if (playerId !== state.hostId) return false;
        if (!state.playerIds.includes(move.targetId)) return false;
        return true;
      }

      case "police-setup": {
        if (move.type !== "place-helicopter") return false;
        const currentPlayerId = this.getCurrentPlayerId(state);
        if (playerId !== currentPlayerId) return false;
        if (!isValidIntersectionPos(move.pos)) return false;
        if (isOccupiedIntersection(state.helicopters, move.pos)) return false;
        return true;
      }

      case "criminal-setup": {
        if (move.type !== "place-criminal") return false;
        if (playerId !== state.criminalId) return false;
        if (!isValidBuildingPos(move.pos)) return false;
        return true;
      }

      case "police-turn": {
        const currentPlayerId = this.getCurrentPlayerId(state);
        if (playerId !== currentPlayerId) return false;

        if (move.type === "move-helicopter") {
          if (move.helicopterIndex !== state.currentHelicopterIndex)
            return false;
          const heli = state.helicopters[move.helicopterIndex];
          if (!heli) return false;
          if (!isValidIntersectionPos(move.pos)) return false;
          if (!isAdjacentIntersection(heli, move.pos)) return false;
          if (
            isOccupiedIntersection(
              state.helicopters,
              move.pos,
              move.helicopterIndex
            )
          )
            return false;
          return true;
        }

        if (move.type === "search-building") {
          if (move.helicopterIndex !== state.currentHelicopterIndex)
            return false;
          const heli = state.helicopters[move.helicopterIndex];
          if (!heli) return false;
          if (!isValidBuildingPos(move.pos)) return false;
          if (!isBuildingSurroundingIntersection(move.pos, heli)) return false;
          return true;
        }

        return false;
      }

      case "criminal-turn": {
        if (move.type !== "move-criminal") return false;
        if (playerId !== state.criminalId) return false;
        if (!state.criminalPos) return false;
        if (!isValidBuildingPos(move.pos)) return false;
        if (!isAdjacentBuilding(state.criminalPos, move.pos)) return false;
        // 痕跡があるビルには移動不可
        if (posKey(move.pos) in state.traces) return false;
        return true;
      }

      default:
        return false;
    }
  },

  applyMove(
    state: CitychaseState,
    move: CitychaseMove,
    _playerId: string
  ): CitychaseState {
    switch (state.phase) {
      case "role-select": {
        if (move.type !== "assign-criminal") return state;
        const criminalId = move.targetId;
        const policeIds = state.playerIds.filter((id) => id !== criminalId);
        const helicopterAssignments = assignHelicopters(policeIds);

        // police-setupの最初のプレイヤー/ヘリを決定
        const firstHelis = getHelicoptersForPlayer(
          helicopterAssignments,
          policeIds[0]
        );

        return {
          ...state,
          phase: "police-setup",
          criminalId,
          policeIds,
          helicopterAssignments,
          currentPoliceIndex: 0,
          currentHelicopterIndex: firstHelis[0],
        };
      }

      case "police-setup": {
        if (move.type !== "place-helicopter") return state;
        const newHelicopters = [...state.helicopters];
        newHelicopters[state.currentHelicopterIndex] = { ...move.pos };

        // 次のヘリ/プレイヤーに進む
        const next = advancePolice({
          ...state,
          helicopters: newHelicopters,
        });

        if (next) {
          return {
            ...state,
            helicopters: newHelicopters,
            currentPoliceIndex: next.policeIndex,
            currentHelicopterIndex: next.heliIndex,
          };
        }

        // 全ヘリ配置完了 → criminal-setup
        return {
          ...state,
          phase: "criminal-setup",
          helicopters: newHelicopters,
          currentPoliceIndex: 0,
          currentHelicopterIndex: 0,
        };
      }

      case "criminal-setup": {
        if (move.type !== "place-criminal") return state;
        const traces = { ...state.traces };
        traces[posKey(move.pos)] = 1; // ラウンド1開始時の痕跡

        // police-turnの最初のプレイヤー/ヘリを決定
        const firstHelis = getHelicoptersForPlayer(
          state.helicopterAssignments,
          state.policeIds[0]
        );

        return {
          ...state,
          phase: "police-turn",
          criminalPos: { ...move.pos },
          traces,
          currentPoliceIndex: 0,
          currentHelicopterIndex: firstHelis[0],
          lastSearchResult: null,
        };
      }

      case "police-turn": {
        if (move.type === "move-helicopter") {
          const newHelicopters = [...state.helicopters];
          newHelicopters[move.helicopterIndex] = { ...move.pos };

          const next = advancePolice(state);
          if (next) {
            return {
              ...state,
              helicopters: newHelicopters,
              currentPoliceIndex: next.policeIndex,
              currentHelicopterIndex: next.heliIndex,
              lastSearchResult: null,
            };
          }

          // 全ヘリ完了 → criminal-turn
          return finalizeCriminalTurn({
            ...state,
            phase: "criminal-turn",
            helicopters: newHelicopters,
            lastSearchResult: null,
          });
        }

        if (move.type === "search-building") {
          const buildingKey = posKey(move.pos);
          const isCriminalHere = isSamePos(state.criminalPos, move.pos);

          if (isCriminalHere) {
            // 犯人発見！警察の勝利
            return {
              ...state,
              finished: true,
              winningSide: "police",
              lastSearchResult: {
                pos: move.pos,
                found: true,
                traceFound: false,
                traceRound: null,
              },
            };
          }

          const traceRound = state.traces[buildingKey] ?? null;
          const newRevealedTraces = [...state.revealedTraces];
          const newSearchedEmpty = [...state.searchedEmpty];

          if (traceRound !== null) {
            // 痕跡あり
            newRevealedTraces.push(createRevealedTrace(move.pos, traceRound));
          } else {
            // 痕跡なし
            newSearchedEmpty.push({ ...move.pos });
          }

          const next = advancePolice(state);
          if (next) {
            return {
              ...state,
              revealedTraces: newRevealedTraces,
              searchedEmpty: newSearchedEmpty,
              currentPoliceIndex: next.policeIndex,
              currentHelicopterIndex: next.heliIndex,
              lastSearchResult: {
                pos: move.pos,
                found: false,
                traceFound: traceRound !== null,
                traceRound:
                  traceRound !== null && (traceRound === 1 || traceRound === 6)
                    ? traceRound
                    : null,
              },
            };
          }

          // 全ヘリ完了 → criminal-turn
          return finalizeCriminalTurn({
            ...state,
            phase: "criminal-turn",
            revealedTraces: newRevealedTraces,
            searchedEmpty: newSearchedEmpty,
            lastSearchResult: {
              pos: move.pos,
              found: false,
              traceFound: traceRound !== null,
              traceRound:
                traceRound !== null && (traceRound === 1 || traceRound === 6)
                  ? traceRound
                  : null,
            },
          });
        }

        return state;
      }

      case "criminal-turn": {
        if (move.type !== "move-criminal") return state;

        const newTraces = { ...state.traces };
        newTraces[posKey(move.pos)] = state.round + 1;

        const newRound = state.round + 1;

        // police-turnの最初のプレイヤー/ヘリを決定
        const firstHelis = getHelicoptersForPlayer(
          state.helicopterAssignments,
          state.policeIds[0]
        );

        return {
          ...state,
          phase: "police-turn",
          criminalPos: { ...move.pos },
          traces: newTraces,
          round: newRound,
          currentPoliceIndex: 0,
          currentHelicopterIndex: firstHelis[0],
          lastSearchResult: null,
          searchedEmpty: [],
        };
      }

      default:
        return state;
    }
  },

  getStatus(state: CitychaseState) {
    if (state.finished) return "finished";

    // criminal-turnフェーズでラウンド11なら犯人勝利
    if (state.phase === "criminal-turn" && state.round >= MAX_ROUNDS) {
      return "finished";
    }

    // criminal-turnフェーズで移動不可なら警察勝利
    if (state.phase === "criminal-turn" && !canCriminalMove(state)) {
      return "finished";
    }

    return "playing";
  },

  getWinner(state: CitychaseState): string | null {
    if (state.winningSide === "police") {
      // 警察陣営の勝利 - ホストIDを返す（チーム戦なので代表）
      return state.policeIds[0] ?? null;
    }
    if (state.winningSide === "criminal") {
      return state.criminalId;
    }

    // getStatus で finished 判定されたがwinningSideが未設定のケース
    if (state.phase === "criminal-turn" && state.round >= MAX_ROUNDS) {
      return state.criminalId;
    }
    if (state.phase === "criminal-turn" && !canCriminalMove(state)) {
      return state.policeIds[0] ?? null;
    }

    return null;
  },

  getCurrentPlayerId(state: CitychaseState): string {
    switch (state.phase) {
      case "role-select":
        return state.hostId;

      case "police-setup":
      case "police-turn": {
        const playerId = state.policeIds[state.currentPoliceIndex];
        return playerId ?? state.policeIds[0];
      }

      case "criminal-setup":
      case "criminal-turn":
        return state.criminalId ?? state.playerIds[0];

      default:
        return state.playerIds[0];
    }
  },

  getPlayerView(
    state: CitychaseState,
    playerId: string
  ): CitychasePlayerView {
    const isCriminal = playerId === state.criminalId;

    if (isCriminal) {
      // 犯人には全情報を公開
      return {
        ...state,
        isCriminal: true,
      };
    }

    // ゲーム終了時は警察にも犯人位置と痕跡を公開
    if (state.finished) {
      return {
        ...state,
        isCriminal: false,
      };
    }

    // 警察には犯人位置と痕跡詳細を隠す
    return {
      ...state,
      criminalPos: null,
      traces: {},
      isCriminal: false,
    };
  },
};
