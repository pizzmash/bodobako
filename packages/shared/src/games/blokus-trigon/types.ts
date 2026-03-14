// ---------------------------------------------------------------------------
// ブロックストライゴン — 型定義
// ---------------------------------------------------------------------------

/** グリッド行数（18行の六角形） */
export const GRID_ROWS = 18;

/** グリッド列数（最大幅35列の矩形包含） */
export const GRID_COLS = 35;

/** ピース数 */
export const NUM_PIECES = 22;

/** 最大色数（6色: 青, 黄, 赤, 緑, 紫, 橙） */
export const MAX_COLORS = 6;

/**
 * 各色のスタート位置 (row, col) — 2/4人戦用（4隅配置）
 *
 * 色0 (青): row6,col9   ▼  左上
 * 色1 (黄): row6,col25  ▼  右上
 * 色2 (赤): row11,col25 ▲  右下
 * 色3 (緑): row11,col9  ▲  左下
 * 色4 (紫): row14,col17 ▼  下中央（予備）
 * 色5 (橙): row3,col17  ▲  上中央（予備）
 *
 * 2人戦（色0〜3, colorOwner=[0,1,0,1]）: 4隅配置
 * 4人戦（色0〜3）: 4隅配置
 */
export const START_POSITIONS: readonly (readonly [number, number])[] = [
  [6, 9],   // 色0: 左上 ▼
  [6, 25],  // 色1: 右上 ▼
  [11, 25], // 色2: 右下 ▲
  [11, 9],  // 色3: 左下 ▲
  [14, 17], // 色4: 下中央 ▼
  [3, 17],  // 色5: 上中央 ▲
];

/**
 * 3人戦専用スタート位置（左上・右上・下中央の均等三角配置）
 */
export const START_POSITIONS_3P: readonly (readonly [number, number])[] = [
  [6, 9],   // 色0: 左上 ▼
  [6, 25],  // 色1: 右上 ▼
  [14, 17], // 色2: 下中央 ▼
];

// ---------------------------------------------------------------------------
// ピース関連
// ---------------------------------------------------------------------------

/** 中心(0,0)からの相対オフセット [dr, dc] の配列 */
export interface PieceVariant {
  readonly cells: readonly (readonly [number, number])[];
  /**
   * このバリアントの基準パリティ。
   * 配置先 (row, col) の `(row+col)%2` がこの値と一致する必要がある。
   * 0 = 中心セルが▲の位置, 1 = 中心セルが▼の位置
   */
  readonly baseParity: 0 | 1;
}

/** 1つのピース。全回転・反転バリアントを保持 */
export interface PieceDefinition {
  readonly id: number;
  /** ピースのマス数（三角セル数） */
  readonly size: number;
  /** 全ユニークバリアント（60°回転×6 + 反転×2 で最大12） */
  readonly variants: readonly PieceVariant[];
  /**
   * 12個の変換インデックス (rot*2+flip) → バリアントインデックス。
   * クライアント側で二面体群 D6 の演算を行い、このテーブルで
   * variantIndex を引くことで正しい回転/反転結果を得る。
   */
  readonly transformToVariant: readonly number[];
}

// ---------------------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------------------

/**
 * 色ごとのビットボードを hex 文字列で保持。
 * bit 位置 = row * GRID_COLS + col (0=左上, 629=右下)
 * bigint は JSON シリアライズ不可のため hex 文字列で格納。
 */
export type ColorBoards = string[];

/**
 * 色ごとの残存ピースビットマスク。
 * bit i が立っていればピース i がまだ未使用。
 * 全ピース所持 = (1 << 22) - 1 = 4194303
 */
export type RemainingPieces = number[];

/**
 * 色 → playerIds のインデックス。
 * 2人戦: [0,1,0,1]  3人戦: [0,1,2]  4人戦: [0,1,2,3]
 * -1 は未使用カラー。
 */
export type ColorOwner = number[];

export interface BlokusTrigonState {
  /** 色ごとの盤面ビットボード (hex 文字列)。使用色数分の配列。 */
  boards: ColorBoards;
  /** 色ごとの残存ピースビットマスク */
  remainingPieces: RemainingPieces;
  /** プレイヤーID一覧 */
  playerIds: string[];
  /** 現在手番の色インデックス */
  currentColorIndex: number;
  /** 色→プレイヤーインデックスのマッピング */
  colorOwner: ColorOwner;
  /** 使用する色数 (2人=4, 3人=3, 4人=4) */
  numColors: number;
  /** 色ごとに初手配置済みか */
  hasPlacedFirst: boolean[];
  /** 色ごとの脱落フラグ（置ける手がなくなったら true） */
  eliminated: boolean[];
  /** 色ごとに最後に置いたピースのサイズ (ボーナス判定用) */
  lastPieceSize: number[];
  /** 3人戦で外周配置禁止 */
  borderRestriction: boolean;
  /** ゲーム終了フラグ */
  finished: boolean;
  /** 直近配置されたピースのセル (絶対座標) と色インデックス */
  lastMove?: { colorIndex: number; cells: readonly (readonly [number, number])[] };
}

export interface BlokusTrigonMove {
  /** ピースID (0-21) */
  pieceId: number;
  /** バリアントインデックス */
  variantIndex: number;
  /** ピース中心のボード行座標 */
  row: number;
  /** ピース中心のボード列座標 */
  col: number;
}
