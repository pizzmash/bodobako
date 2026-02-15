# Bodobako（ボド箱）- プロジェクトガイド

オンラインマルチプレイヤーボードゲームプラットフォーム。

## 技術スタック

- **言語:** TypeScript 5.7（strict mode）
- **フロントエンド:** React 19 + Vite 6
- **バックエンド:** Hono 4 + Socket.IO 4
- **パッケージ管理:** npm workspaces（モノレポ）
- **スタイリング:** インライン CSS-in-JS（CSSフレームワークなし）
- **ルーティング:** React Router不使用。`RoomContext` の状態に基づく条件レンダリング

## ディレクトリ構成

```
packages/
├── shared/        # 共有型定義・ゲームロジック・ゲームレジストリ
│   └── src/
│       ├── types/     # game.ts, room.ts, protocol.ts
│       └── games/     # ゲームごとのディレクトリ（othello/, aiuebattle/）
├── server/        # Hono + Socket.IO バックエンド
│   └── src/
│       ├── index.ts
│       ├── engine/    # game-engine.ts, room-manager.ts
│       └── handlers/  # room-handlers.ts, game-handlers.ts
└── client/        # React + Vite フロントエンド
    └── src/
        ├── context/       # RoomContext.tsx（グローバル状態管理）
        ├── components/    # Lobby, Room, GameView, AppHeader, NameEntryModal, GameResultCard
        ├── games/         # ゲームごとのUIコンポーネント（othello/, aiuebattle/）
        └── lib/           # socket.ts（Socket.IOシングルトン）
```

## 開発コマンド

```bash
npm run dev          # フロント(5173) + バック(3001) 同時起動
npm run build        # shared → server → client の順にビルド
npm run update-readme  # README のゲーム一覧を更新
```

## アーキテクチャ

### バックエンド（Hono + Socket.IO）

- **Hono**: 軽量高速なWebフレームワーク。管理用APIエンドポイント（`/admin/api/*`）を提供
- **Socket.IO**: リアルタイム双方向通信。ゲームの状態更新とルーム管理に使用
- **統合**: `@hono/node-server` を使用して Hono アプリを Node.js HTTP サーバーに変換し、Socket.IO を同じサーバーインスタンスに接続

### GameDefinition インターフェース

すべてのゲームは `GameDefinition<TState, TMove>` を実装する：

- `createInitialState(playerIds)` - 初期状態生成
- `validateMove(state, move, playerId)` - 手の妥当性検証
- `applyMove(state, move, playerId)` - 手の適用
- `getStatus(state)` - `"playing"` | `"finished"`
- `getWinner(state)` - 勝者ID or null
- `getCurrentPlayerId(state)` - 現在の手番プレイヤー

ゲームロジックはサーバーから完全に分離されている。サーバーは定義のメソッドを呼ぶだけ。

### 画面遷移

```
NameEntryModal → Lobby → Room（モーダル） → GameView → GameResultCard
```

状態ベース: `playerName` の有無 → `room` の有無 → `room.status`（waiting/playing/finished）

### Socket.IO イベント

**Client → Server:** `room:create`, `room:join`, `room:leave`, `game:start`, `game:move`
**Server → Client:** `room:updated`, `game:started`, `game:stateUpdated`, `game:ended`, `room:left`, `error`

### 状態管理

`RoomContext`（React Context API）で `useRoom()` フックから利用。Socket.IO のイベントでサーバーと同期。

## 実装済みゲーム

- **Othello（オセロ）** - 2人対戦、8x8盤面
- **Aiuebattle（あいうえバトル）** - 2-5人、ひらがなボードを使った単語推理ゲーム（3フェーズ: topic-select → word-input → battle）

## 新しいゲームの追加手順

1. `packages/shared/src/games/<game>/` に `types.ts`, `logic.ts`, `definition.ts` を作成
2. `packages/shared/src/games/index.ts` のレジストリに登録
3. `packages/shared/src/index.ts` から export
4. `packages/client/src/games/<game>/` に UI コンポーネント作成
5. `packages/client/src/components/GameView.tsx` に case を追加

## コーディング規約

- コミットメッセージは日本語（例: `feat: ロビー画面をカードベースの1画面UIにリッチ化`）
- アニメーションは `useEffect` + `<style>` タグで CSS keyframes を注入
- モーダルは fixed backdrop + blur パターン
- エラーメッセージは日本語
- サーバーはインメモリ（DB不使用）、ルームコードは4文字英数字
