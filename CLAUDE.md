# Bodobako（ボド箱）- プロジェクトガイド

オンラインマルチプレイヤーボードゲームプラットフォーム。

## 技術スタック

- **言語:** TypeScript 5.7（strict mode）
- **フロントエンド:** React 19 + Vite 6
- **バックエンド:** Hono 4 + Cloudflare Workers + Durable Objects
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
├── worker/        # Cloudflare Workers バックエンド
│   ├── src/
│   │   ├── index.ts   # Hono エントリ（HTTP API + WS upgrade）
│   │   └── RoomDO.ts  # Durable Object（ルーム管理・WebSocket）
│   └── wrangler.toml
└── client/        # React + Vite フロントエンド
    └── src/
        ├── context/       # RoomContext.tsx（グローバル状態管理）
        ├── components/    # Lobby, Room, GameView, AppHeader, NameEntryModal, GameResultCard
        ├── games/         # ゲームごとのUIコンポーネント（othello/, aiuebattle/）
        └── lib/           # socket.ts（ネイティブWebSocketシングルトン）
```

## 開発コマンド

```bash
npm run dev          # wrangler dev (8787) + Vite (5173) 同時起動
npm run build        # shared → worker → client の順にビルド
npm run update-readme  # README のゲーム一覧を更新
```

## アーキテクチャ

### バックエンド（Cloudflare Workers + Durable Objects）

- **Workers（index.ts）**: Hono による HTTP API。ルーム作成（`POST /rooms`）とWebSocket upgrade（`GET /rooms/:code/ws`）を担当
- **RoomDO**: Durable Object クラス。1ルーム = 1 DOインスタンス。WebSocket Hibernation APIで接続管理、DO Alarmsで切断タイマーを実装
- **RoomRegistry**: SQLite-backed Durable Object（シングルインスタンス）。ルームコードの登録・重複確認・一覧管理を担当。KVの代替

### WebSocket通信プロトコル（ネイティブWS）

`reqId` ベースのリクエスト/レスポンス方式を採用。

**Client → Server（`WsClientMessage`型）:**
- `room:join` / `session:reconnect` — reqId付き、ackで応答
- `room:leave` / `game:start` / `game:move` — 応答なし

**Server → Client（`WsServerMessage`型）:**
- `ack` — reqIdに対応する応答（ok/error）
- `room:updated` / `game:started` / `game:stateUpdated` / `game:ended` / `room:left` / `error`

型定義: `packages/shared/src/types/protocol.ts`

### GameDefinition インターフェース

すべてのゲームは `GameDefinition<TState, TMove>` を実装する：

- `createInitialState(playerIds)` - 初期状態生成
- `validateMove(state, move, playerId)` - 手の妥当性検証
- `applyMove(state, move, playerId)` - 手の適用
- `getStatus(state)` - `"playing"` | `"finished"`
- `getRanking(state)` - 順位リスト（1位から順）or null（引き分け）
- `getCurrentPlayerId(state)` - 現在の手番プレイヤー
- `getPlayerView?(state, playerId)` - プレイヤーごとの視界制御（任意）

ゲームロジックはWorkerから完全に分離されている。RoomDOは定義のメソッドを呼ぶだけ。

### 画面遷移

```
NameEntryModal → Lobby → Room（モーダル） → GameView → GameResultCard
```

状態ベース: `playerName` の有無 → `room` の有無 → `room.status`（waiting/playing/finished）

### 状態管理

`RoomContext`（React Context API）で `useRoom()` フックから利用。ネイティブWebSocketのイベントでサーバーと同期。

### セッション管理

クライアントは `crypto.randomUUID()` で生成したセッショントークンを `localStorage` に保持。WS切断時、DO Alarmsで30秒後に自動削除。同じトークンで再接続すれば進行中のゲームに復帰できる。

## 実装済みゲーム

- **Othello（オセロ）** - 2人対戦、8x8盤面
- **Aiuebattle（あいうえバトル）** - 2-5人、ひらがなボードを使った単語推理ゲーム（3フェーズ: topic-select → word-input → battle）
- **Citychase（シティチェイス）** - 2-4人、犯人と警察に分かれた非対称追跡ゲーム
- **SonicRestaurant（音速飯点）** - 2-6人、中華料理カードを重ねるスピードゲーム

## 新しいゲームの追加手順

1. `packages/shared/src/games/<game>/` に `types.ts`, `logic.ts`, `definition.ts` を作成
2. `packages/shared/src/games/index.ts` のレジストリに登録
3. `packages/shared/src/index.ts` から export
4. `packages/client/src/games/<game>/` に UI コンポーネント作成
5. `packages/client/src/components/GameView.tsx` に case を追加

Worker側のコード修正は不要。`GameDefinition` インターフェースを通じて自動的にゲームが動作する。

## デプロイ（Cloudflare）

```bash
# Workerをデプロイ（初回はDurable Objectのマイグレーションも自動適用）
npx wrangler deploy --config packages/worker/wrangler.toml

# フロントエンドはCloudflare Pagesにデプロイ
# ビルドコマンド: npm run build
# 出力ディレクトリ: packages/client/dist
# 環境変数: VITE_API_URL=https://bodobako-worker.YOUR_SUBDOMAIN.workers.dev
```

## コーディング規約

- コミットメッセージは日本語（例: `feat: ロビー画面をカードベースの1画面UIにリッチ化`）
- アニメーションは `useEffect` + `<style>` タグで CSS keyframes を注入
- モーダルは fixed backdrop + blur パターン
- エラーメッセージは日本語
- ルームコードは4文字英数字（紛らわしい文字を除いた32文字から生成）
- 状態はDurable Objectのストレージに永続化（`ctx.storage.put("room", ...)`）
