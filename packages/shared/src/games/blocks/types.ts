// ---------------------------------------------------------------------------
// ブロックス — 型定義
// ---------------------------------------------------------------------------

/** 盤面サイズ */
export const BOARD_SIZE = 20;

/** ピース数 */
export const NUM_PIECES = 21;

/** 色数（常に4色。2-3人でも4色使う） */
export const NUM_COLORS = 4;

/**
 * 各色の開始角（row, col）
 * 色0=左上, 色1=右上, 色2=右下, 色3=左下
 */
export const START_CORNERS = [
  [0, 0],
  [0, 19],
  [19, 19],
  [19, 0],
] as const;

// ---------------------------------------------------------------------------
// ピース関連
// ---------------------------------------------------------------------------

/** 中心(0,0)からの相対オフセット [dr, dc] の配列 */
export interface PieceVariant {
  readonly cells: readonly (readonly [number, number])[];
}

/** 1つのピース。全回転・反転バリアントを保持 */
export interface PieceDefinition {
  readonly id: number;
  /** ピースのマス数 */
  readonly size: number;
  /** 全ユニークバリアント（回転×反転で最大8） */
  readonly variants: readonly PieceVariant[];
}

// ---------------------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------------------

/**
 * 色ごとのビットボードを hex 文字列で保持。
 * bit 位置 = row * 20 + col （0=左上, 399=右下）
 * bigint は JSON シリアライズ不可のため hex 文字列で格納。
 */
export type ColorBoards = [string, string, string, string];

/**
 * 色ごとの残存ピースビットマスク。
 * bit i が立っていればピース i がまだ未使用。
 * 全ピース所持 = (1 << 21) - 1 = 2097151
 */
export type RemainingPieces = [number, number, number, number];

/**
 * 色 → playerIds のインデックス。
 * 2人戦: [0,1,0,1]  3人戦: [0,1,2,-1]  4人戦: [0,1,2,3]
 * -1 はフリーカラー（3人戦の色3）
 */
export type ColorOwner = [number, number, number, number];

export interface BlocksState {
  /** 色ごとの盤面ビットボード（hex 文字列） */
  boards: ColorBoards;
  /** 色ごとの残存ピースビットマスク */
  remainingPieces: RemainingPieces;
  /** プレイヤーID一覧 */
  playerIds: string[];
  /** 現在手番の色インデックス (0-3) */
  currentColorIndex: number;
  /** 色→プレイヤーインデックスのマッピング */
  colorOwner: ColorOwner;
  /**
   * 3人戦でフリーカラー（色3）を次にプレイする playerIds インデックス。
   * 0→1→2→0… とローテーション。2人/4人戦では 0 固定。
   */
  freeColorNextPlayer: number;
  /** 色ごとに初手配置済みか */
  hasPlacedFirst: [boolean, boolean, boolean, boolean];
  /** 色ごとの脱落フラグ（置ける手がなくなったら true） */
  eliminated: [boolean, boolean, boolean, boolean];
  /** ゲーム終了フラグ */
  finished: boolean;
}

export interface BlocksMove {
  /** ピースID (0-20) */
  pieceId: number;
  /** バリアントインデックス */
  variantIndex: number;
  /** ピース中心のボード行座標 (0-19) */
  row: number;
  /** ピース中心のボード列座標 (0-19) */
  col: number;
}
