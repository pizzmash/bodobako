# Client 実装ガイド

## ディレクトリ構成

```
src/
├── components/        # 共通UIコンポーネント（AppHeader, Lobby, Room, Sidebar等）
├── context/           # AuthContext（Firebase認証）、RoomContext（WebSocket・ルーム状態）
├── games/<game>/      # ゲームごとのUIコンポーネント
│   ├── <Game>Board.tsx        # エントリコンポーネント（GameView から参照）
│   ├── <SubComponent>.tsx     # サブコンポーネント（100〜200行を目安に分割）
│   ├── hooks/use<X>.ts        # ゲーム固有フック
│   └── constants.ts           # デザイントークン・定数
├── hooks/             # 共通カスタムフック
├── lib/               # socket.ts（WSシングルトン）、constants.ts、color.ts
└── styles/tokens.ts   # z-index・フォント定数（Z, FONT, BODY_FONT）
```

---

## 新ゲームの追加手順

### 1. shared パッケージへの登録（必須3点）

`packages/shared/src/games/index.ts` を編集：

```ts
// (1) GameId リテラル型に追加
export type GameId = "othello" | ... | "mygame";

// (2) GameDefinitionMap インターフェースに追加
export interface GameDefinitionMap {
  mygame: GameDefinition<MyGameState, MyGameMove>;
}

// (3) registry オブジェクトに追加
const registry = { ..., mygame: myGameDefinition };
```

### 2. RoomContext の GameStateEntry 型に追加

`src/context/RoomContext.tsx`:

```ts
export type GameStateEntry =
  | { gameId: "othello"; state: OthelloState }
  | { gameId: "mygame"; state: MyGameState }; // ← 追加
```

### 3. GameView.tsx への登録

`src/components/GameView.tsx`:

```tsx
const MyGameBoard = lazy(() =>
  import("../games/mygame/MyGameBoard").then((m) => ({ default: m.MyGameBoard }))
);

// switch 内
case "mygame":
  board = <MyGameBoard />;
  break;
```

> **注意:** `default` ケースはコンパイルエラーにならないため、追加後は必ず動作確認すること。

### 4. PlayerSlot の作成と登録

`src/games/<game>/<Game>PlayerSlot.tsx` を作成する（既存の `BlokusPlayerSlot.tsx` や `NanaPlayerSlot.tsx` を参考）。

`src/components/GameView.tsx` の `playerSlotMap` にエントリを追加する：

```tsx
const MyGamePlayerSlot = lazy(() =>
  import("../games/mygame/MyGamePlayerSlot").then((m) => ({
    default: m.MyGamePlayerSlot,
  })),
);

const playerSlotMap: Partial<Record<GameId, ComponentType<PlayerSlotProps>>> = {
  // ...
  mygame: MyGamePlayerSlot as ComponentType<PlayerSlotProps>,
};
```

`definition.ts` で `getLogEntries?(prevState, newState)` を実装すると、サイドバーのログパネルに手順が自動表示される（推奨）。

### 5. サイドバー拡張（任意）

プレイヤーカラーのカスタムマッピングや、ログエントリへの SVG アイコン追加が必要な場合は `src/games/<game>/sidebarExtras.ts(x)` を作成し、`GameView.tsx` の `sidebarExtrasMap` にエントリを追加する：

```tsx
// src/games/mygame/sidebarExtras.ts
export function getMyGamePlayerColorMap(state: MyGameState): Record<string, string> { ... }
export function renderMyGameLogItemExtra(item: GameLogItem): ReactNode { ... }

// GameView.tsx
const sidebarExtrasMap: Partial<Record<GameId, SidebarExtras>> = {
  mygame: {
    getPlayerColorMap: (s) => getMyGamePlayerColorMap(s as never),
    renderLogItemExtra: renderMyGameLogItemExtra,
  },
};
```

`getLogEntries` の `GameLogEntry.metadata` にゲーム固有データ（ピースIDなど）を乗せておくと `renderLogItemExtra` 内で参照できる。

### 4. ファイル・定数の命名

CSS クラス名・keyframe 名に使うプレフィックスを衝突しない2〜4文字で決める。

| ゲーム          | プレフィックス |
| --------------- | -------------- |
| Othello         | `ot-`          |
| Aiuebattle      | `ab-`          |
| Blokus          | `blk-`         |
| CityChase       | `cc-`          |
| Nana            | `nana-`        |
| SonicRestaurant | `sr-`          |
| NyaMens         | `nya-`         |

`constants.ts` に以下を定義する：

```ts
export const C = {
  primary: "#...",
  bg: "#...",
  text: "#...",
} as const;

export const FONT = "'Poppins', sans-serif";
export const APP_HEADER_HEIGHT = 76; // 共通値（変えない）
```

---

## React Hooks ルール（必須）

フックより前に条件リターンを置いてはいけない（React の基本ルール）。

```tsx
// ❌ NG: Hooks ルール違反（動作が不安定になる）
export function GameBoard() {
  const { gameState } = useRoom();
  if (gameState?.gameId !== "mygame") return null; // ← NG
  const [count, setCount] = useState(0); // ← フック
}

// ✅ OK: フックをすべて先に呼び、条件リターンは後
export function GameBoard() {
  const { gameState } = useRoom();
  const state = gameState?.gameId === "mygame" ? gameState.state : null;
  const [count, setCount] = useState(0); // ← フックは上部に全部まとめる
  const isMobile = useIsMobile();

  if (!state) return null; // ← フックの後でリターン
}
```

---

## アニメーション

### 定義場所のルール

| 用途                                                                          | 定義場所                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Tailwind `animate-*` クラスとして JSX で使う (`className="animate-cc-pulse"`) | `tailwind.config.ts` の `keyframes` / `animation` セクションに追記 |
| inline `style={{ animation: "foo .3s" }}` で使う                              | `src/index.css` の `@keyframes` に追記                             |
| ゲーム固有の CSS クラス (`.mg-pulse { animation: ... }`)                      | `src/index.css` の `@layer components` にプレフィックス付きで追記  |

### ❌ tailwind.config.ts と index.css の両方に同じ keyframe を定義しない

同じ名前の keyframe を両ファイルに書くと二重定義になる（過去に発生した問題）。
Tailwind JIT は `animate-*` クラスが JSX に登場しない keyframe を出力しないため、inline style で参照する場合は `index.css` への記述が必要。

---

## アイコン

UIに絵文字を使用しない。アイコンが必要な場合は `lucide-react` の SVG アイコンを使う。
lucide に適切なアイコンがない場合は、最も近い意味のアイコンで代替する。

---

## スタイリング

### スタイリング手法の使い分け（値の性質で判断する）

| 値の性質                                 | 手法                      | 例                                             |
| ---------------------------------------- | ------------------------- | ---------------------------------------------- |
| **固定値**（条件分岐なし・props 非依存） | **Tailwind クラス**       | `flex`, `items-center`, `p-4`, `text-sm`       |
| **動的値**（props・state・計算値に依存） | **inline style**          | `style={{ width: cardW, color: playerColor }}` |
| **複雑な hover/active/アニメーション**   | **ゲーム固有 CSS クラス** | `.cc-glass-panel:hover { ... }`                |

同一コンポーネント内で固定値と動的値が混在する場合は、**固定値を className に、動的値のみ style に**分離する：

```tsx
// ✅ 正しい分離
<div
  className="flex items-center gap-2 rounded-lg p-3"
  style={{ borderColor: dynamicColor, background: `${playerColor}20` }}
/>

// ❌ 固定値を inline style に書かない
<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderColor: dynamicColor }} />
```

### ❌ `constants.ts` に固定値 styles オブジェクトを作らない

`CSSProperties` 型のオブジェクトを定義してコンポーネントに `style={styles.xxx}` で渡すパターンは**アンチパターン**。Tailwind の恩恵（PurgeCSS・一貫性）が失われる。

```ts
// ❌ NG: 固定値を CSSProperties オブジェクトにまとめない
export const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
    background: "#fff",
  },
};

// ✅ OK: 動的値のみ constants で持ち、className に直接 Tailwind クラスを書く
// コンポーネント側: <div className="flex flex-col p-4 bg-white" style={{ background: C.primary }} />
```

`constants.ts` に定義してよいもの: カラートークン（`C`）、レイアウト計算値（`LAYOUT.cardWidth`）、フォント文字列（`FONT`）。

### z-index は必ず `styles/tokens.ts` の `Z` 定数を使う

```ts
import { Z } from "../../styles/tokens";

// ✅
<div style={{ zIndex: Z.overlay }}>...</div>

// ❌ magic number は衝突の原因
<div style={{ zIndex: 1000 }}>...</div>
```

z-index の階層（変更不可）:

```
Z.header      = 900   ← AppHeader
Z.modal       = 950   ← 汎用モーダル
Z.overlay     = 1090  ← ゲーム結果オーバーレイ
Z.sidebar     = 1100  ← サイドバー
Z.invite      = 1200  ← 招待通知
Z.inviteModal = 1300  ← 招待モーダル
Z.roomError   = 2000  ← ルームエラー表示
```

ゲームボード内部で独自のレイヤー制御（SVG レイヤー・セル重なり等）が必要な場合は、`styles/tokens.ts` にゲームプレフィックス付きの定数を追加する：

```ts
// tokens.ts に追加する例
export const Z = {
  // ...共通定数...
  blkBoardSvg: 1, // blokus: SVG 描画レイヤー
  blkBoardCell: 2, // blokus: インタラクション用セル
  srTableCard: 15, // sonic-restaurant: テーブルカード
} as const;
```

> 汎用モーダルには既存の `Z.modal` を使い、新しい定数は**ゲーム固有のレイヤー制御にのみ**追加する。

---

## レイアウト

### モバイル対応

```tsx
const isMobile = useIsMobile(); // useBreakpoint(640) のラッパー

if (!isMobile) {
  return <DesktopLayout />;
}
return <MobileLayout />;
```

複雑なゲームボードではデスクトップ／モバイルで JSX ツリーを完全に分岐するパターンを推奨（状態が共有されリセットを防げる）。フックは分岐の前にすべて呼ぶこと（Hooks ルール）。

### ゲーム結果オーバーレイ

全ゲームで `GameResultCard` コンポーネントを使う：

```tsx
if (gameResult) {
  const winnerId = gameResult.ranking?.[0] ?? null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.overlay,
        background: "rgba(15,23,42,0.34)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <GameResultCard
          result={winnerId === playerId ? "win" : "lose"}
          winnerName={room.players.find((p) => p.id === winnerId)?.name}
          isHost={room.hostId === playerId}
          onRematch={startGame}
          onLeave={leaveRoom}
        />
      </div>
    </div>
  );
}
```

---

## move 送信

`sendMove` の引数は `unknown` 型だが、呼び出し側で型を明示すること：

```ts
// ✅ 型を確定させてから渡す
const move: MyMove = { type: "place", x, y };
sendMove(move);

// ❌ as キャストは避ける
sendMove({ type: "place" } as MyMove);
```

---

## コンポーネントサイズの目安

- `<Game>Board.tsx` が **400行を超えたら積極的に分割**する
- 各サブコンポーネントは **100〜200行** を目安にする
- ロジックが複雑なフックは `hooks/use<X>.ts` に切り出す

---

## 追加時チェックリスト

```
□ shared: GameId 追加
□ shared: GameDefinitionMap 追加
□ shared: registry に definition 登録
□ client: RoomContext の GameStateEntry に追加
□ client: GameView.tsx に lazy import と switch case 追加
□ client: games/<game>/<Game>PlayerSlot.tsx を作成し GameView.tsx の playerSlotMap に登録
□ client: サイドバー拡張が必要なら sidebarExtras.ts(x) を作成し sidebarExtrasMap に登録
□ client: games/<game>/ ディレクトリ構成を整備
□ client: constants.ts でプレフィックスとカラートークンを定義
□ client: アニメーション keyframe の置き場所を決定（tailwind.config or index.css、両方に書かない）
□ client: フックはすべて条件リターンより前に宣言（Hooks ルール）
□ client: z-index は Z 定数を使用（magic number 禁止）
□ client: 固定値 inline style がない（固定値は Tailwind クラス、動的値のみ style={{}} に残す）
□ client: constants.ts に固定値の CSSProperties オブジェクトを作っていない
□ client: モバイルレイアウト動作確認（useIsMobile）
□ client: GameResultCard でゲーム終了表示を実装
□ npm run build でビルドが通ることを確認
□ npm test でテストが全パスすることを確認
```
