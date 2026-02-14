// === 座標 ===
export interface BuildingPos {
  row: number; // 0-4
  col: number; // 0-4
}

export interface IntersectionPos {
  row: number; // 0-3
  col: number; // 0-3
}

// === フェーズ ===
export type CitychasePhase =
  | "role-select" // ホストが犯人を指名
  | "police-setup" // 警察がヘリ初期配置
  | "criminal-setup" // 犯人が初期ビル選択
  | "police-turn" // 警察ターン（移動 or 捜索）
  | "criminal-turn"; // 犯人ターン（移動）

// === 痕跡（公開情報） ===
export interface RevealedTrace {
  pos: BuildingPos;
  round: number | null; // 1 or 6 の場合のみ数値公開、それ以外はnull
}

// === 捜索結果（直近の捜索結果表示用） ===
export interface SearchResult {
  pos: BuildingPos;
  found: boolean; // 犯人発見
  traceFound: boolean; // 痕跡あり
  traceRound: number | null; // 1 or 6 の場合のみ
}

// === ゲーム状態 ===
export interface CitychaseState {
  playerIds: string[];
  phase: CitychasePhase;
  round: number; // 1-11

  // 役割
  criminalId: string | null;
  policeIds: string[];
  hostId: string;

  // ヘリコプター（3基固定）
  helicopters: (IntersectionPos | null)[]; // 未配置はnull
  helicopterAssignments: string[]; // helicopters[i] を担当するplayerId

  // 犯人情報（getPlayerViewで警察から隠す）
  criminalPos: BuildingPos | null;
  traces: Record<string, number>; // "row,col" -> round番号（全痕跡、内部用）

  // 公開情報
  revealedTraces: RevealedTrace[]; // 捜索で発見された痕跡
  searchedEmpty: BuildingPos[]; // 捜索して痕跡なしだったビル
  lastSearchResult: SearchResult | null; // 直近の捜索結果

  // ターン進行
  currentPoliceIndex: number; // policeIds内のindex
  currentHelicopterIndex: number; // そのプレイヤーの担当ヘリの何基目か

  // 結果
  finished: boolean;
  winningSide: "police" | "criminal" | null;
}

// === プレイヤーに送信するフィルタ済みState ===
export interface CitychasePlayerView
  extends Omit<CitychaseState, "criminalPos" | "traces"> {
  criminalPos: BuildingPos | null; // 犯人のみ見える、警察はnull
  traces: Record<string, number>; // 犯人のみ見える、警察は空
  isCriminal: boolean;
}

// === ムーブ ===
export type CitychaseMove =
  | { type: "assign-criminal"; targetId: string }
  | { type: "place-helicopter"; pos: IntersectionPos }
  | { type: "place-criminal"; pos: BuildingPos }
  | {
      type: "move-helicopter";
      helicopterIndex: number;
      pos: IntersectionPos;
    }
  | {
      type: "search-building";
      helicopterIndex: number;
      pos: BuildingPos;
    }
  | { type: "move-criminal"; pos: BuildingPos };
