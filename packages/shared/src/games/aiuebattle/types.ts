export const BOARD_CHARS = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ", "を", "ん",
  "ー",
] as const;

export const TOPIC_LIST = [
  "飲みもの", "のりもの", "文房具", "動物", "職業",
  "食べ物", "音のでるもの", "スポーツ", "キャラクター", "学校にあるもの",
  "いま部屋にあるもの", "コンビニにあるもの", "行きたい場所", "最近出かけた場所",
  "公園にあるもの", "最近買ったもの", "家にあるもの", "この近所にあるもの",
  "楽器", "野菜", "くだもの", "お菓子", "キッチン用品", "電子機器",
  "架空の生き物", "いま食べたいもの", "年間行事",
  "春といえば", "夏といえば", "秋といえば", "冬といえば",
  "お正月", "夏休み", "海といえば", "山といえば", "旅に持っていくもの",
  "本のタイトル", "ゲームのタイトル", "マンガのタイトル",
  "有名人の名前", "バンド・グループの名前", "会社の名前", "チェーン店の名前",
  "武器の名前", "技の名前", "日本の観光地", "海外の観光地", "あいさつ",
  "宇宙といえば", "お弁当のおかず", "めん類", "中華料理", "パンといえば",
  "植物", "虫", "生き物", "寿司ネタ", "おいしいもの", "なつかしいもの",
  "大好きなもの", "嫌いなもの", "あまいもの", "にがいもの", "禁止されてるもの",
  "あたたかいもの", "つめたいもの", "赤いもの", "丸いもの", "長いもの",
  "大きいもの", "やわらかいもの", "とぶもの", "まわるもの",
];

export const WORD_LENGTH = 7;

export interface AiueBattleState {
  playerIds: string[];
  phase: "topic-select" | "word-input" | "battle";
  topic: string | null;
  topicSelectorId: string;
  words: Record<string, string[]>;
  submittedPlayers: string[];
  usedChars: boolean[];
  currentPlayerIndex: number;
  attackCount: number;
  lastAttackHit: boolean;
  lastAttackChar: string | null;
  lastAttackPlayerId: string | null;
  revealed: Record<string, (boolean | "end")[]>;
  eliminatedPlayers: string[];
  eliminationOrder: string[];
  finished: boolean;
  winnerId: string | null;
}

export type AiueBattleMove =
  | { type: "select-topic"; topic: string }
  | { type: "submit-word"; word: string[] }
  | { type: "attack"; charIndex: number };
