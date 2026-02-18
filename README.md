# Bodobako - ボド箱

ブラウザ用リアルタイムマルチプレイヤーボードゲームプラットフォーム。
ルームコードを共有してオンライン対戦が可能。

## 技術スタック

| レイヤー       | 技術                                          |
| -------------- | --------------------------------------------- |
| 言語           | TypeScript 5.7 (strict mode)                  |
| フロントエンド | React 19 + Vite 6                             |
| バックエンド   | Hono 4 + Cloudflare Workers + Durable Objects |
| 通信           | ネイティブ WebSocket（reqIdベースプロトコル） |
| モジュール     | ES Modules                                    |
| パッケージ管理 | npm workspaces (monorepo)                     |

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
│   │   │   ├── index.ts      # Hono エントリ（HTTP API + WS upgrade）
│   │   │   └── RoomDO.ts     # Durable Object（ルーム管理・WebSocket）
│   │   └── wrangler.toml
│   │
│   └── client/          # フロントエンド
│       └── src/
│           ├── main.tsx              # エントリーポイント
│           ├── lib/
│           │   └── socket.ts         # WebSocket クライアント（再接続付き）
│           ├── context/
│           │   └── RoomContext.tsx   # WS 接続 & 状態管理
│           ├── components/
│           │   ├── Lobby.tsx         # ロビー（ゲーム選択・ルーム作成/参加）
│           │   ├── Room.tsx          # 待機画面（プレイヤー一覧・開始ボタン）
│           │   └── GameView.tsx      # ゲームコンポーネントの振り分け
│           └── games/
│               └── <game-id>/    # 各ゲームの UI コンポーネント
│
├── package.json         # ワークスペース定義
└── tsconfig.base.json   # 共通 TypeScript 設定
```

## アーキテクチャ

### 全体の流れ

```
┌──────────┐  ネイティブWS   ┌────────────────────┐    import     ┌──────────┐
│  Client  │ ◄─────────────► │  Cloudflare Worker  │ ◄───────────► │  Shared  │
│ (React)  │  HTTP (POST)    │  + Durable Objects  │               │ (Types/  │
│          │ ◄─────────────► │  (Hono / RoomDO)    │               │  Logic)  │
└──────────┘                 └────────────────────┘               └──────────┘
```

- **shared**: ゲームルール（ロジック）と型定義を持つ。サーバーとクライアントの両方から参照される
- **worker**: ルーム管理とゲーム進行を担当。Durable Objects で状態を永続化する
- **client**: UI の描画とユーザー操作の送信を担当。shared の型とユーティリティを使って盤面を表示する

### 画面遷移

```
NameEntryModal（名前入力）
  │
  ▼
Lobby（ロビー）
  │  ルーム作成（HTTP POST）or 参加（WS + room:join）
  ▼
Room（待機画面）
  │  ホストがゲーム開始
  ▼
GameView（ゲーム画面）
  │  ゲーム終了 → 結果表示 → リマッチ or ロビーへ
  ▼
Lobby or GameView
```

ルーターは使わず、`RoomContext` の状態（`playerName` の有無 → `room` の有無 → `room.status`）に応じたコンポーネントの出し分けで画面遷移を実現している。

### WebSocket プロトコル

ルーム作成のみ HTTP POST、それ以外はすべてネイティブ WebSocket で通信する。
コールバックの代わりに `reqId` による非同期リクエスト/レスポンスパターンを使用。

| 方向            | タイプ              | 説明                               |
| --------------- | ------------------- | ---------------------------------- |
| Client → Server | `room:join`         | ルーム参加（reqId付き、ack返却）   |
| Client → Server | `session:reconnect` | セッションで再接続（reqId付き）    |
| Client → Server | `room:leave`        | ルーム退出                         |
| Client → Server | `game:start`        | ゲーム開始（ホストのみ）           |
| Client → Server | `game:move`         | 手を打つ                           |
| Server → Client | `ack`               | reqIdに対する応答（ok/error）      |
| Server → Client | `room:updated`      | ルーム状態の同期                   |
| Server → Client | `game:started`      | ゲーム開始通知                     |
| Server → Client | `game:stateUpdated` | ゲーム状態更新                     |
| Server → Client | `game:ended`        | ゲーム終了・結果通知               |
| Server → Client | `room:left`         | ルーム退出完了                     |
| Server → Client | `error`             | エラー通知                         |

### GameDefinition インターフェース

すべてのゲームは以下のインターフェースを実装する。これがゲーム追加の核となる設計。

```typescript
interface GameDefinition<TState, TMove> {
  id: string;        // 一意なゲームID（例: "othello"）
  name: string;      // 表示名（例: "オセロ"）
  description: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[], hostId?: string): TState;
  validateMove(state: TState, move: TMove, playerId: string): boolean;
  applyMove(state: TState, move: TMove, playerId: string): TState;
  getStatus(state: TState): "playing" | "finished";
  getRanking(state: TState): string[] | null; // 1位から順、null=引き分け
  getCurrentPlayerId(state: TState): string;
  getPlayerView?(state: TState, playerId: string): unknown; // 非対称情報対応
}
```

Worker の `RoomDO` がこのインターフェースを通じてゲームを動かすため、ゲーム固有のロジックはWorker本体に一切入らない。`getPlayerView` を実装すれば、手牌を隠すなどの非対称情報ゲームにも対応可能。

### セッション管理

クライアントは `crypto.randomUUID()` で生成したセッショントークンを `localStorage` に保持する。WebSocket 切断時、RoomDO は Alarms API で 30 秒の猶予期間を設け、同じトークンでの `session:reconnect` により進行中のゲームに復帰できる。

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

クライアントの `VITE_API_URL=http://localhost:8787` により Worker に接続する（`.env.development` で設定済み）。

### ビルド

```bash
npm run build   # shared → worker → client の順にビルド
```

### 環境変数

| 変数           | デフォルト（dev） | 説明                               |
| -------------- | ----------------- | ---------------------------------- |
| `VITE_API_URL` | `http://localhost:8787` | Worker の URL（HTTP/WS共用） |

## デプロイ（Cloudflare）

```bash
# 1. Workerをデプロイ（初回はDurable Objectのマイグレーションも自動適用）
npx wrangler deploy --config packages/worker/wrangler.toml

# 2. フロントエンドをCloudflare Pagesにデプロイ
#    ビルドコマンド: npm run build
#    出力ディレクトリ: packages/client/dist
#    環境変数: VITE_API_URL=https://bodobako-worker.YOUR_SUBDOMAIN.workers.dev
```

## 新しいゲームの追加方法

新しいゲームを追加するには、以下の **4 箇所** を修正する。

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
export function createInitialState(playerIds: string[]): MyGameState { /* ... */ }
export function validateMove(state: MyGameState, move: MyGameMove, playerId: string): boolean { /* ... */ }
export function applyMove(state: MyGameState, move: MyGameMove, playerId: string): MyGameState { /* ... */ }
export function getRanking(state: MyGameState): string[] | null { /* ... */ }
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

`packages/shared/src/games/index.ts` にゲームを追加する。

```typescript
import { myGameDefinition } from "./mygame/index.js";
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

### チェックリスト

- [ ] `types.ts` でゲーム状態と手の型を定義した
- [ ] `logic.ts` でルール（初期化・検証・適用・勝敗判定）を実装した
- [ ] `definition.ts` で `GameDefinition` を実装した
- [ ] `games/index.ts` のレジストリに登録した
- [ ] クライアント側のボードコンポーネントを作成した
- [ ] `GameView.tsx` に分岐を追加した
- [ ] 必要に応じて `shared/src/index.ts` に型の export を追加した
- [ ] `npm run update-readme` で README の収録ゲーム一覧を更新した

Worker 側のコード修正は不要。`GameDefinition` インターフェースを通じて自動的にゲームが動作する。

## 収録

<!-- GAMES:START -->
| ゲーム | 人数 | 概要 |
|--------|------|------|
| オセロ | 2人 | 8x8 盤面で石を挟んでひっくり返す定番ゲーム |
| あいうえバトル | 2〜5人 | お題に沿った言葉を書き、相手の文字を当てて攻撃するワードバトル |
| シティチェイス | 2〜4人 | 犯人と警察に分かれて、5×5のビル群を舞台に追跡劇を繰り広げる非対称対戦ゲーム |
| 音速飯点 | 2〜6人 | 中華料理の具材カードをスピード勝負で重ねて、いち早く手札を無くせ！ |
<!-- GAMES:END -->
