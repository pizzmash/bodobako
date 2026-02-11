# Bodobako - ボードゲームオンライン

ブラウザで遊べるリアルタイムマルチプレイヤーボードゲームプラットフォーム。ルームコードを共有するだけで、友達とオンライン対戦できる。

## 収録ゲーム

<!-- GAMES:START -->
| ゲーム | 人数 | 概要 |
|--------|------|------|
| オセロ | 2人 | 8x8 盤面で石を挟んでひっくり返す定番ゲーム |
| あいうえバトル | 2〜5人 | お題に沿った言葉を書き、相手の文字を当てて攻撃するワードバトル |
<!-- GAMES:END -->

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| 言語 | TypeScript 5.7 (strict mode) |
| フロントエンド | React 19 + Vite 6 |
| バックエンド | Express 4 + Socket.IO 4 |
| モジュール | ES Modules |
| パッケージ管理 | npm workspaces (monorepo) |

## プロジェクト構成

```
bodobako/
├── packages/
│   ├── shared/          # 共有パッケージ（型定義・ゲームロジック）
│   │   └── src/
│   │       ├── types/
│   │       │   ├── game.ts       # GameDefinition インターフェース
│   │       │   ├── room.ts       # RoomInfo, Player 型
│   │       │   └── protocol.ts   # Socket.IO イベント型定義
│   │       └── games/
│   │           ├── index.ts      # ゲームレジストリ
│   │           ├── othello/      # オセロのロジック
│   │           └── aiuebattle/   # あいうえバトルのロジック
│   │
│   ├── server/          # バックエンド
│   │   └── src/
│   │       ├── index.ts          # Express + Socket.IO サーバー起動
│   │       ├── engine/
│   │       │   ├── room-manager.ts   # ルーム管理
│   │       │   └── game-engine.ts    # ゲーム進行エンジン
│   │       └── handlers/
│   │           ├── room-handlers.ts  # ルーム系イベントハンドラ
│   │           └── game-handlers.ts  # ゲーム系イベントハンドラ
│   │
│   └── client/          # フロントエンド
│       └── src/
│           ├── main.tsx              # エントリーポイント
│           ├── context/
│           │   └── RoomContext.tsx    # Socket.IO 接続 & 状態管理
│           ├── components/
│           │   ├── Lobby.tsx         # ロビー（ゲーム選択・ルーム作成/参加）
│           │   ├── Room.tsx          # 待機画面（プレイヤー一覧・開始ボタン）
│           │   └── GameView.tsx      # ゲームコンポーネントの振り分け
│           └── games/
│               ├── othello/
│               │   └── OthelloBoard.tsx
│               └── aiuebattle/
│                   └── AiueBattleBoard.tsx
│
├── package.json         # ワークスペース定義
└── tsconfig.base.json   # 共通 TypeScript 設定
```

## アーキテクチャ

### 全体の流れ

```
┌──────────┐    Socket.IO     ┌──────────┐    import     ┌──────────┐
│  Client  │ ◄──────────────► │  Server  │ ◄───────────► │  Shared  │
│ (React)  │    WebSocket     │(Express) │               │ (Types/  │
│          │                  │          │               │  Logic)  │
└──────────┘                  └──────────┘               └──────────┘
```

- **shared**: ゲームルール（ロジック）と型定義を持つ。サーバーとクライアントの両方から参照される
- **server**: ルーム管理とゲーム進行を担当。shared のロジックを使って手の検証・適用を行う
- **client**: UI の描画とユーザー操作の送信を担当。shared の型とユーティリティを使って盤面を表示する

### 画面遷移

```
Lobby（ロビー）
  │  ルーム作成 or 参加
  ▼
Room（待機画面）
  │  ホストがゲーム開始
  ▼
GameView（ゲーム画面）
  │  ゲーム終了 → 結果表示 → リマッチ or ロビーへ
  ▼
Lobby or GameView
```

ルーターは使わず、`RoomContext` の状態（`room.status`）に応じたコンポーネントの出し分けで画面遷移を実現している。

### Socket.IO イベント

| 方向 | イベント | 説明 |
|------|----------|------|
| Client → Server | `room:create` | ルーム作成 |
| Client → Server | `room:join` | ルーム参加 |
| Client → Server | `room:leave` | ルーム退出 |
| Client → Server | `game:start` | ゲーム開始（ホストのみ） |
| Client → Server | `game:move` | 手を打つ |
| Server → Client | `room:updated` | ルーム状態の同期 |
| Server → Client | `game:started` | ゲーム開始通知 |
| Server → Client | `game:stateUpdated` | ゲーム状態更新 |
| Server → Client | `game:ended` | ゲーム終了・結果通知 |
| Server → Client | `error` | エラー通知 |

### GameDefinition インターフェース

すべてのゲームは以下のインターフェースを実装する。これがゲーム追加の核となる設計。

```typescript
interface GameDefinition<TState, TMove> {
  id: string;                    // 一意なゲームID（例: "othello"）
  name: string;                  // 表示名（例: "オセロ"）
  minPlayers: number;
  maxPlayers: number;

  createInitialState(playerIds: string[]): TState;                      // 初期状態の生成
  validateMove(state: TState, move: TMove, playerId: string): boolean;  // 手の検証
  applyMove(state: TState, move: TMove, playerId: string): TState;     // 手の適用
  getStatus(state: TState): GameStatus;                                 // "playing" | "finished"
  getCurrentPlayerId(state: TState): string;                            // 現在の手番プレイヤー
  getWinner(state: TState): string | null;                             // 勝者の判定
}
```

サーバーの `game-engine` がこのインターフェースを通じてゲームを動かすため、ゲーム固有のロジックはサーバー本体に一切入らない。

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
- **Express + Socket.IO** (サーバー): `http://localhost:3001`

Vite の proxy 設定により、クライアントからの `/socket.io` リクエストはサーバーに転送される。

### ビルド

```bash
npm run build
```

shared → server → client の順にビルドされる。

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | `3001` | サーバーのポート番号 |

## 新しいゲームの追加方法

新しいゲームを追加するには、以下の **4 箇所** を修正する。

### 1. ゲームロジックの実装 (shared)

`packages/shared/src/games/<game-id>/` ディレクトリを作成し、以下のファイルを用意する。

**`types.ts`** - ゲーム固有の型定義

```typescript
// ゲームの状態
export interface MyGameState {
  board: string[][];
  currentPlayerIndex: number;
  playerIds: string[];
  // ...ゲーム固有のフィールド
}

// プレイヤーの手
export interface MyGameMove {
  row: number;
  col: number;
  // ...ゲーム固有のフィールド
}
```

**`logic.ts`** - ゲームルールの実装

```typescript
import type { MyGameState, MyGameMove } from "./types.js";

export function createInitialState(playerIds: string[]): MyGameState { /* ... */ }
export function validateMove(state: MyGameState, move: MyGameMove, playerId: string): boolean { /* ... */ }
export function applyMove(state: MyGameState, move: MyGameMove, playerId: string): MyGameState { /* ... */ }
// ...
```

**`definition.ts`** - GameDefinition の実装

```typescript
import type { GameDefinition } from "../../types/game.js";
import type { MyGameState, MyGameMove } from "./types.js";
import * as logic from "./logic.js";

export const myGameDefinition: GameDefinition<MyGameState, MyGameMove> = {
  id: "mygame",
  name: "マイゲーム",
  minPlayers: 2,
  maxPlayers: 4,
  createInitialState: logic.createInitialState,
  validateMove: logic.validateMove,
  applyMove: logic.applyMove,
  getStatus: logic.getStatus,
  getCurrentPlayerId: logic.getCurrentPlayerId,
  getWinner: logic.getWinner,
};
```

**`index.ts`** - バレルエクスポート

```typescript
export { myGameDefinition } from "./definition.js";
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
// packages/client/src/games/mygame/MyGameBoard.tsx
import { useRoom } from "../../context/RoomContext";
import type { MyGameState, MyGameMove } from "@bodobako/shared";

export function MyGameBoard() {
  const { gameState, playerId, sendMove } = useRoom();
  const state = gameState as MyGameState;

  const handleMove = (move: MyGameMove) => {
    sendMove(move);
  };

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

// switch (room.gameId) 内に追加
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

サーバー側のコード修正は不要。`GameDefinition` インターフェースを通じて自動的にゲームが動作する。
