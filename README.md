# Bodobako - ボド箱

ブラウザ用リアルタイムマルチプレイヤーボードゲームプラットフォーム。
ルームコードを共有してオンライン対戦が可能。

## 技術スタック

| レイヤー       | 技術                                               |
| -------------- | -------------------------------------------------- |
| 言語           | TypeScript 5.7 (strict mode)                       |
| フロントエンド | React 19 + Vite 6 + React Router v7                |
| バックエンド   | Hono 4 + Cloudflare Workers + Durable Objects + R2 |
| 通信           | ネイティブ WebSocket（reqIdベースプロトコル）      |
| 認証           | Firebase Authentication（Google サインイン）       |
| モジュール     | ES Modules                                         |
| パッケージ管理 | npm workspaces (monorepo)                          |

## プロジェクト構成

```
bodobako/
├── packages/
│   ├── shared/          # 共有パッケージ（型定義・ゲームロジック）
│   │   └── src/
│   │       ├── types/
│   │       │   ├── game.ts       # GameDefinition インターフェース
│   │       │   ├── room.ts       # RoomInfo, Player 型
│   │       │   └── protocol.ts   # WebSocket メッセージ型定義
│   │       └── games/
│   │           ├── index.ts      # ゲームレジストリ
│   │           └── <game-id>/    # 各ゲームのロジック
│   │
│   ├── worker/          # Cloudflare Workers バックエンド
│   │   ├── src/
│   │   │   ├── index.ts          # Hono エントリ（HTTP API + WS upgrade）
│   │   │   ├── RoomSession.ts    # Durable Object（ルーム管理・WebSocket）
│   │   │   └── lib/
│   │   │       ├── r2UserStorage.ts        # R2 ユーザーデータ操作
│   │   │       └── verifyFirebaseToken.ts  # Firebase JWT 検証（jose）
│   │   └── wrangler.toml
│   │
│   └── client/          # フロントエンド
│       └── src/
│           ├── main.tsx              # エントリーポイント
│           ├── lib/
│           │   ├── socket.ts         # WebSocket クライアント（再接続付き）
│           │   └── firebase.ts       # Firebase app / auth 初期化
│           ├── context/
│           │   ├── AuthContext.tsx   # Firebase 認証状態・アプリ表示名管理
│           │   └── RoomContext.tsx   # WS 接続 & 状態管理 & navigate 統合
│           ├── components/
|           │   ├── Lobby.tsx         # ロビー（ゲーム選択・ルーム作成/参加）
|           │   ├── Room.tsx          # 待機画面（プレイヤー一覧・開始ボタン）
|           │   ├── RoomPage.tsx      # /room/:code ページ（接続・遷移制御）
│           │   ├── GameView.tsx      # ゲームコンポーネントの振り分け
│           │   └── Sidebar.tsx       # 認証 UI・表示名編集・フレンドコード
│           └── games/
│               └── <game-id>/    # 各ゲームの UI コンポーネント
│
├── package.json         # ワークスペース定義
└── tsconfig.base.json   # 共通 TypeScript 設定
```

## アーキテクチャ

### 全体の流れ

```
┌──────────┐ HTTP (POST)  ┌──────────────────┐
│  Client  │─────────────►│  Worker (Hono)   │
│ (React)  │ WS upgrade   │ ルーター/プロキシ │
│          │─────────────►└────────┬─────────┘
│          │                       │ stub.fetch()
│          │              ┌────────▼─────────┐
│          │◄────────────►│  RoomSession     │
└────┬─────┘  WebSocket   │  WS・ゲーム状態   │
     │      (upgrade経由) └────────┬─────────┘
     │  import              import │
     └──────────────┬──────────────┘
                    ▼
             ┌──────────┐
             │  Shared  │
             │ (Types/  │
             │  Logic)  │
             └──────────┘
```

- **shared**: ゲームルール（ロジック）と型定義を持つ。サーバーとクライアントの両方から参照される
- **worker**: ルーム管理とゲーム進行を担当。Durable Objects で状態を永続化する。ログイン済みユーザーのプロフィール・フォロー・招待データは Cloudflare R2 に保存する（`lib/r2UserStorage.ts`）
- **client**: UI の描画とユーザー操作の送信を担当。Firebase Authentication（Google サインイン）によるオプションログインに対応。ログインしなくても従来通りプレイ可能

### 画面遷移

```
/  →  Lobby（NameEntryModal オーバーレイ付き）
        │  ルーム作成（HTTP POST）or 参加（WS + room:join）
        ▼
/room/:code  →  待機画面（Room）
        │  ホストがゲーム開始
        ▼
/room/:code  →  ゲーム画面（GameView） → 結果表示 → ロビーへ
```

URL が source of truth。`createRoom` / `joinRoom` 成功時に `navigate('/room/:code')`、`leaveRoom` 時に `navigate('/')` を呼ぶ。ブラウザの戻るボタンは `useBlocker` で制御し確認ダイアログを表示する。

`/room/:code` への直接アクセス・リロード時は `RoomPage` が `session:reconnect` を試み、失敗時は `joinRoom` にフォールバックする。
`playerName` 未設定時は `NameEntryModal` をその場で表示し、入力後に自動接続する。

### WebSocket プロトコル

ルーム作成のみ HTTP POST、それ以外はすべてネイティブ WebSocket で通信する。
コールバックの代わりに `reqId` による非同期リクエスト/レスポンスパターンを使用。

| 方向            | タイプ              | 説明                             |
| --------------- | ------------------- | -------------------------------- |
| Client → Server | `room:join`         | ルーム参加（reqId付き、ack返却） |
| Client → Server | `session:reconnect` | セッションで再接続（reqId付き）  |
| Client → Server | `room:leave`        | ルーム退出                       |
| Client → Server | `game:start`        | ゲーム開始（ホストのみ）         |
| Client → Server | `game:move`         | 手を打つ                         |
| Server → Client | `ack`               | reqIdに対する応答（ok/error）    |
| Server → Client | `room:updated`      | ルーム状態の同期                 |
| Server → Client | `game:started`      | ゲーム開始通知                   |
| Server → Client | `game:stateUpdated` | ゲーム状態更新                   |
| Server → Client | `game:ended`        | ゲーム終了・結果通知             |
| Server → Client | `room:left`         | ルーム退出完了                   |
| Server → Client | `error`             | エラー通知                       |

### GameDefinition インターフェース

すべてのゲームは以下のインターフェースを実装する。これがゲーム追加の核となる設計。

```typescript
interface GameDefinition<TState, TMove> {
  id: string; // 一意なゲームID（例: "othello"）
  name: string; // 表示名（例: "オセロ"）
  description: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[], hostId?: string): TState;
  parseMove?(raw: unknown): TMove | null; // 構造バリデーション（任意）
  validateMove(state: TState, move: TMove, playerId: string): boolean;
  applyMove(state: TState, move: TMove, playerId: string): TState;
  getStatus(state: TState): "playing" | "finished";
  getRanking(state: TState): string[] | null; // 1位から順、null=引き分け
  getCurrentPlayerId(state: TState): string;
  getPlayerView?(state: TState, playerId: string): unknown; // 手札など秘匿情報をプレイヤーごとにマスク
  getLogEntries?(prevState: TState, newState: TState): GameLogEntry[]; // ゲームログ生成（原則実装）
}
```

### セッション管理

クライアントは `crypto.randomUUID()` で生成したセッショントークンを `localStorage` に保持する。WebSocket 切断時、RoomSession は Alarms API で 30 秒の猶予期間を設け、同じトークンでの `session:reconnect` により進行中のゲームに復帰できる。

## 開発

### セットアップ

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

以下が並行して起動する:

- **Vite dev server** (クライアント): `http://localhost:5173`
- **wrangler dev** (Worker): `http://localhost:8787`

クライアントの `VITE_API_URL=http://localhost:8787` により Worker に接続する。`.env.development.example` をコピーして `.env.development` を作成し、Firebase の設定値を入力すること。

### ビルド

```bash
npm run build   # shared → worker → client の順にビルド
```

### テスト

```bash
# ユニット・統合テスト（全パッケージ）
npm test

# E2E テスト（開発サーバーが自動起動）
npm run test:e2e
```

| コマンド           | 対象                     | ツール     |
| ------------------ | ------------------------ | ---------- |
| `npm test`         | shared / client / worker | Vitest     |
| `npm run test:e2e` | ブラウザ E2E             | Playwright |

**テスト構成:**

- **shared** — 各ゲームそれぞれのロジック・定義層ユニットテスト
- **client** — WebSocketクライアント（`socket.ts`）と `RoomContext` の統合テスト。`happy-dom` + `@testing-library/react` 使用
- **worker** — Cloudflare Workers ランタイム上で HTTP API と Durable Object の WebSocket メッセージハンドラをテスト
- **e2e** — ロビー操作・ルーム作成参加退出・オセロゲームプレイ・再接続の Playwright シナリオ

### 環境変数

**クライアント（`.env.development` / Cloudflare Pages の環境変数）:**

| 変数                        | デフォルト（dev）              | 説明                                                               |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `VITE_API_URL`              | `http://localhost:8787`        | Worker の URL（HTTP/WS共用）                                       |
| `VITE_FIREBASE_API_KEY`     | —                              | Firebase API キー                                                  |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` | Firebase Auth ドメイン                                             |
| `VITE_FIREBASE_PROJECT_ID`  | —                              | Firebase プロジェクト ID                                           |
| `VITE_BMC_USERNAME`         | —                              | Buy Me a Coffee のユーザー名（省略時はウィジェット・バナー非表示） |

`.env.development.example` をコピーして `.env.development` を作成し、Firebase コンソールから各値を設定する。`VITE_BMC_USERNAME` は [Buy Me a Coffee](https://www.buymeacoffee.com/) のユーザー名を設定する（省略時はウィジェット・バナー非表示）。

**Worker（`wrangler.toml` の `[vars]`）:**

| 変数                  | 説明                                       |
| --------------------- | ------------------------------------------ |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID（JWT 検証に使用） |

## デプロイ（Cloudflare）

```bash
# 1. Workerをデプロイ（初回はDurable Objectのマイグレーションも自動適用）
npx wrangler deploy --config packages/worker/wrangler.toml

# 2. フロントエンドをCloudflare Pagesにデプロイ
#    ビルドコマンド: npm run build
#    出力ディレクトリ: packages/client/dist
#    環境変数（Cloudflare Pages の設定画面で入力）:
#      VITE_API_URL=https://bodobako-worker.YOUR_SUBDOMAIN.workers.dev
#      VITE_FIREBASE_API_KEY=...
#      VITE_FIREBASE_AUTH_DOMAIN=...
#      VITE_FIREBASE_PROJECT_ID=...
#      VITE_BMC_USERNAME=your-buymeacoffee-username
```

**Firebase コンソールの事前設定（初回のみ）:**

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication > Sign-in method > Google を有効化
3. 「Authorized domains」に本番ドメイン（Cloudflare Pages の URL）を追加
4. プロジェクト設定 > マイアプリ > SDK の設定と構成 から config を取得

> **SPA ルーティング注意**: `packages/client/public/_redirects` に `/* /index.html 200` を記述済み。Cloudflare Pages での `/room/:code` 直アクセス・リロード時の 404 を防ぐ。

## 新しいゲームの追加方法

新しいゲームを追加するには、以下の **6 箇所** を修正する。

### 1. ゲームロジックの実装 (shared)

`packages/shared/src/games/<game-id>/` ディレクトリを作成し、以下のファイルを用意する。

**`types.ts`** - ゲーム固有の型定義

```typescript
export interface MyGameState {
  currentPlayerIndex: number;
  playerIds: string[];
  // ...ゲーム固有のフィールド
}

export interface MyGameMove {
  // ...ゲーム固有のフィールド
}
```

**`logic.ts`** - ゲームルールの実装

```typescript
export function createInitialState(playerIds: string[]): MyGameState {
  /* ... */
}
export function validateMove(
  state: MyGameState,
  move: MyGameMove,
  playerId: string,
): boolean {
  /* ... */
}
export function applyMove(
  state: MyGameState,
  move: MyGameMove,
  playerId: string,
): MyGameState {
  /* ... */
}
export function getRanking(state: MyGameState): string[] | null {
  /* ... */
}
```

**`definition.ts`** - GameDefinition の実装

```typescript
import type { GameDefinition } from "../../types/game.js";

export const myGameDefinition: GameDefinition<MyGameState, MyGameMove> = {
  id: "mygame",
  name: "マイゲーム",
  description: "ゲームの概要説明",
  minPlayers: 2,
  maxPlayers: 4,
  // ...メソッド実装
};
```

### 2. ゲームレジストリへの登録 (shared)

`packages/shared/src/games/index.ts` にゲームを追加する。registry への登録に加え、**`GameId` 型と `GameDefinitionMap` インターフェースにも追加する**（型安全なアクセスのために必要）。

```typescript
import { myGameDefinition } from "./mygame/index.js";
import type { MyGameState, MyGameMove } from "./mygame/types.js";

// GameId リテラル型に追加
export type GameId =
  | "othello"
  | "aiuebattle"
  | "citychase"
  | "sonic-restaurant"
  | "mygame";

// GameDefinitionMap に追加
export interface GameDefinitionMap {
  // ... 既存エントリ
  mygame: GameDefinition<MyGameState, MyGameMove>;
}

registry.set(myGameDefinition.id, myGameDefinition);
```

クライアントから型やユーティリティを使う場合は `packages/shared/src/index.ts` にも export を追加する。

### 3. ゲーム UI の作成 (client)

`packages/client/src/games/<game-id>/` にボードコンポーネントを作成する。

```typescript
import { useRoom } from "../../context/RoomContext";
import type { MyGameState, MyGameMove } from "@bodobako/shared";

export function MyGameBoard() {
  const { gameState, playerId, sendMove, gameResult, room, leaveRoom } = useRoom();
  const state = gameState as MyGameState;

  return (
    <div>{/* 盤面の描画 */}</div>
  );
}
```

`useRoom()` から取得できる主な値:

- `gameState` - 現在のゲーム状態（`as MyGameState` でキャスト）
- `playerId` - 自分のプレイヤーID
- `sendMove(move)` - 手を送信する関数
- `room` - ルーム情報（プレイヤー一覧など）
- `gameResult` - ゲーム終了時の結果

### 4. GameView への追加 (client)

`packages/client/src/components/GameView.tsx` の switch 文にケースを追加する。

```typescript
import { MyGameBoard } from "../games/mygame/MyGameBoard";

case "mygame":
  return <MyGameBoard />;
```

### 5. PlayerSlot の作成と登録 (client)

`packages/client/src/games/<game-id>/<Game>PlayerSlot.tsx` を作成する。既存の `BlokusPlayerSlot.tsx` や `NanaPlayerSlot.tsx` を参考にすること。

`packages/client/src/components/GameView.tsx` の `playerSlotMap` にエントリを追加する：

```typescript
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

`definition.ts` に `getLogEntries?(prevState, newState)` を実装するとサイドバーのログパネルに手順が自動表示される（推奨）。

### 6. サイドバー拡張（任意）

プレイヤーカラーのカスタムマッピングや、ログエントリへの SVG アイコン追加が必要な場合は `packages/client/src/games/<game-id>/sidebarExtras.ts(x)` を作成し、`GameView.tsx` の `sidebarExtrasMap` に登録する：

```typescript
// sidebarExtras.ts(x)
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

`getLogEntries` の `GameLogEntry.metadata` にゲーム固有データを乗せておくと `renderLogItemExtra` で参照できる。

### チェックリスト

- [ ] `types.ts` でゲーム状態と手の型を定義した
- [ ] `logic.ts` でルール（初期化・検証・適用・勝敗判定）を実装した
- [ ] `definition.ts` で `GameDefinition` を実装した（`parseMove` を含む）
- [ ] `games/index.ts` のレジストリに登録し、`GameId` 型と `GameDefinitionMap` インターフェースにも追加した
- [ ] クライアント側のボードコンポーネントを作成した
- [ ] `GameView.tsx` に分岐を追加した
- [ ] `<Game>PlayerSlot.tsx` を作成し、`GameView.tsx` の `playerSlotMap` に登録した
- [ ] 必要に応じて `sidebarExtras.ts(x)` を作成し、`GameView.tsx` の `sidebarExtrasMap` に登録した
- [ ] 必要に応じて `definition.ts` に `getLogEntries` を実装した（サイドバーログ表示）
- [ ] 必要に応じて `shared/src/index.ts` に型の export を追加した
- [ ] `npm run update-readme` で README の収録ゲーム一覧を更新した

Worker 側のコード修正は不要。`GameDefinition` インターフェースを通じて自動的にゲームが動作する。

## 収録

<!-- GAMES:START -->
| ゲーム | 人数 | 概要 |
|--------|------|------|
| あいうえバトル | 2〜5人 | お題に沿った言葉を書き、相手の文字を当てて攻撃するワードバトル |
| チャオチャオ | 2〜4人 | サイコロを振ってウソをつけ！橋を渡るブラフすごろく |
| シティチェイス | 2〜4人 | 犯人と警察に分かれて、5×5のビル群を舞台に追跡劇を繰り広げる非対称対戦ゲーム |
| 音速飯点 | 2〜6人 | 中華料理の具材カードをスピード勝負で重ねて、いち早く手札を無くせ！ |
| ブロックス | 2〜4人 | 20×20 の盤面にピースを角で繋げて配置する陣取りゲーム |
| ブロックストライゴン | 2〜4人 | 三角形のピースを角で繋げて配置する六角形盤面の陣取りゲーム |
| ナナ | 2〜5人 | 7をねらえ！3枚ペアの神経衰弱ゲーム |
| ニャーメンズ | 2〜5人 | アサシンが潜む協力修理ゲーム。全30枚のカードを順番に並べ修理を完成させよ！ |
<!-- GAMES:END -->
