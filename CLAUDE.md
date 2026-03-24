# Bodobako（ボド箱）- プロジェクトガイド

オンラインマルチプレイヤーボードゲームプラットフォーム。

## 技術スタック

- **言語:** TypeScript 5.7（strict mode）
- **フロントエンド:** React 19 + Vite 6
- **バックエンド:** Hono 4 + Cloudflare Workers + Durable Objects
- **認証:** Firebase Authentication（Google サインイン）+ `jose` による Worker 側 JWT 検証
- **パッケージ管理:** npm workspaces（モノレポ）
- **スタイリング:** Tailwind CSS v3 + カスタム CSS (`@layer components`)
- **ルーティング:** React Router v7（`react-router-dom`）。`createBrowserRouter` + `RouterProvider` による2ルート構成（`/` と `/room/:code`）

## ディレクトリ構成

```
packages/
├── shared/        # 共有型定義・ゲームロジック・ゲームレジストリ
│   └── src/
│       ├── types/     # game.ts, room.ts, protocol.ts
│       └── games/     # ゲームごとのディレクトリ（othello/, aiuebattle/）
├── worker/        # Cloudflare Workers バックエンド
│   ├── src/
│   │   ├── index.ts          # Hono エントリ（HTTP API + WS upgrade）
│   │   ├── RoomSession.ts    # Durable Object（ルーム管理・WebSocket）
│   │   └── lib/
│   │       ├── r2UserStorage.ts        # R2 ユーザーデータ操作
│   │       └── verifyFirebaseToken.ts  # Firebase JWT 検証（jose）
│   └── wrangler.toml
└── client/        # React + Vite フロントエンド
    └── src/
        ├── context/       # AuthContext.tsx（Firebase 認証）、RoomContext.tsx（WS状態管理）
        ├── components/    # Lobby, Room, RoomPage, GameView, AppHeader, NameEntryModal, GameResultCard, Sidebar
        ├── games/         # ゲームごとのUIコンポーネント（othello/, aiuebattle/）
        └── lib/           # socket.ts（ネイティブWebSocketシングルトン）、firebase.ts（Firebase初期化）
```

## 開発コマンド

```bash
npm run dev          # wrangler dev (8787) + Vite (5173) 同時起動
npm run build        # shared → worker → client の順にビルド
npm run update-readme  # README のゲーム一覧を更新
npm test             # ユニット・統合テスト（shared + client + worker）
npm run test:e2e     # E2E テスト（Playwright、dev サーバーを自動起動）
```

## アーキテクチャ

### バックエンド（Cloudflare Workers + Durable Objects）

- **Workers（index.ts）**: Hono による HTTP API。ルーム作成（`POST /rooms`）とWebSocket upgrade（`GET /rooms/:code/ws`）、認証済みユーザー向けプロフィール API（`GET/PUT /users/me`）を担当
- **RoomSession**: Durable Object クラス。1ルーム = 1 DOインスタンス。WebSocket Hibernation APIで接続管理、DO Alarmsで切断タイマーを実装。`idToken` が付いていれば `verifyFirebaseToken` で検証して `player.userId` を付与
- **R2（USER_DATA バインディング）**: ログイン済みユーザーのプロフィール・フォロー関係・招待データを Cloudflare R2 に保存。`lib/r2UserStorage.ts` が操作を担当。楽観的ロック（etag CAS）で同時書き込みを制御する

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
- `parseMove?(raw)` - rawデータをTMove型にパース。構造が不正な場合はnullを返す（任意）
- `validateMove(state, move, playerId)` - 手の妥当性検証（moveはTMove型）
- `applyMove(state, move, playerId)` - 手の適用
- `getStatus(state)` - `"playing"` | `"finished"`
- `getRanking(state)` - 順位リスト（1位から順）or null（引き分け）
- `getCurrentPlayerId(state)` - 現在の手番プレイヤー
- `getPlayerView?(state, playerId)` - プレイヤーごとの視界制御（任意）
- `getLogEntries?(prevState, newState)` - 状態遷移のログエントリ生成（任意）。`GameLogEntry[]` を返し、クライアントが蓄積して表示する

ゲームロジックはWorkerから完全に分離されている。RoomDOは定義のメソッドを呼ぶだけ。

**moveの処理フロー（RoomDO）**: `parseMove` → `validateMove` → `applyMove` の順で呼ばれる。`parseMove` が null を返すと即座に拒否。型ガードロジックは `parseMove` に、ゲームルール検証は `validateMove` に分離する。

### ゲームレジストリの型安全アクセス

`packages/shared/src/games/index.ts` に `GameId` リテラル型と `GameDefinitionMap` インターフェースを定義している。`getGameDefinition` はオーバーロードにより、**ゲームIDがコンパイル時に既知**の場合は具体的な型付き定義を返す：

```typescript
// IDがリテラル型なら GameDefinition<OthelloState, OthelloMove> が返る
const def = getGameDefinition("othello");
// IDが動的 string なら後方互換で GameDefinition | undefined が返る
const def2 = getGameDefinition(someRuntimeId);
```

新しいゲームを追加したら `GameId` 型と `GameDefinitionMap` インターフェースへの追加も忘れずに行う。

### 画面遷移

```
/  →  Lobby（NameEntryModal オーバーレイ付き）
        │  ルーム作成 or 参加
        ▼
/room/:code  →  RoomPage（接続中 → Room待機室 → GameView → GameResultCard）
```

URL が source of truth。`RoomContext` の `createRoom` / `joinRoom` が成功時に `navigate('/room/:code')` を呼ぶ。`leaveRoom` は `navigate('/')` を呼ぶ。

- `/room/:code` に直接アクセス → `RoomPage` がセッション再接続を試み、失敗時は `joinRoom` にフォールバック
- `playerName` 未設定時はどちらのルートでも `NameEntryModal` をオーバーレイ表示
- ブラウザ戻るボタンは `useBlocker` で制御し確認ダイアログを挟む

### 認証（Firebase Authentication）

- `AuthContext`（`packages/client/src/context/AuthContext.tsx`）が Firebase の `onIdTokenChanged` でサブスクライブし、ログイン状態・idToken・アプリ独自表示名・フレンドコードを管理する
- ログイン後に `GET /users/me` でプロフィールを取得。404（未登録）の場合は Google 表示名をデフォルトとして `PUT /users/me` で自動登録
- `AuthProvider` は `RoomProvider` の外側に配置（`RoomContext` が `useAuth()` を呼ぶため）
- Worker 側では `verifyFirebaseToken`（`jose` 使用）で Firebase RS256 JWT を検証。Google JWKS URL からキーを自動取得する
- ログインしなくても従来通りプレイ可能（認証はオプション）

### 状態管理

`RoomContext`（React Context API）で `useRoom()` フックから利用。ネイティブWebSocketのイベントでサーバーと同期。`createBrowserRouter` のレイアウトルート（`Layout` コンポーネント）の内側に `RoomProvider` を配置することで `useNavigate()` を直接利用できる。

**`RoomContext` が公開する主な関数：**

- `createRoom(playerName, gameId)` — HTTP POST → WS 接続 → `navigate('/room/:code')`
- `joinRoom(roomCode, playerName)` — WS + room:join → `navigate('/room/:code')`（既にそのページなら `replace: true`）
- `leaveRoom()` — WS 切断 + 状態クリア + `navigate('/')`
- `proceedLeave()` — WS 切断 + 状態クリアのみ（`navigate` なし）。`useBlocker` の `proceed()` と組み合わせて使う
- `connectToRoom(code, playerName)` — `/room/:code` マウント時に呼ぶ。`session:reconnect` → 失敗時 `joinRoom` にフォールバック

### セッション管理

クライアントは `crypto.randomUUID()` で生成したセッショントークンを `localStorage` に保持。WS切断時、DO Alarmsで30秒後に自動削除。同じトークンで再接続すれば進行中のゲームに復帰できる。

React Router 導入後は **URL の `:code` が source of truth**。`localStorage.roomCode` は補助的な役割に格下げ（`sessionToken` は引き続き localStorage で管理）。`/room/:code` にアクセスすると `RoomPage` が `connectToRoom(code, playerName)` を呼び、sessionToken と URL の code で自動復帰を試みる。

## 実装済みゲーム

<!-- GAMES:START -->
- **あいうえバトル** - 2〜5人、お題に沿った言葉を書き、相手の文字を当てて攻撃するワードバトル
- **チャオチャオ** - 2〜4人、サイコロを振ってウソをつけ！橋を渡るブラフすごろく
- **シティチェイス** - 2〜4人、犯人と警察に分かれて、5×5のビル群を舞台に追跡劇を繰り広げる非対称対戦ゲーム
- **音速飯点** - 2〜6人、中華料理の具材カードをスピード勝負で重ねて、いち早く手札を無くせ！
- **ブロックス** - 2〜4人、20×20 の盤面にピースを角で繋げて配置する陣取りゲーム
- **ブロックストライゴン** - 2〜4人、三角形のピースを角で繋げて配置する六角形盤面の陣取りゲーム
- **ナナ** - 2〜5人、7をねらえ！3枚ペアの神経衰弱ゲーム
- **ニャーメンズ** - 2〜5人、アサシンが潜む協力修理ゲーム。全30枚のカードを順番に並べ修理を完成させよ！
<!-- GAMES:END -->

## 新しいゲームの追加手順

1. `packages/shared/src/games/<game>/` に `types.ts`, `logic.ts`, `definition.ts` を作成
2. `packages/shared/src/games/index.ts` のレジストリに登録し、`GameId` 型と `GameDefinitionMap` インターフェースにも追加
3. `packages/shared/src/index.ts` から export
4. `packages/client/src/games/<game>/` に UI コンポーネント作成
5. `packages/client/src/components/GameView.tsx` に case を追加（`switch` 文 + `playerSlotMap` へのエントリ登録）
6. `packages/client/src/games/<game>/<Game>PlayerSlot.tsx` を作成（共通サイドバーのプレイヤー表示用）

`definition.ts` で `getLogEntries?(prevState, newState)` を実装すると、共通サイドバーのログパネルに手順が自動表示される（推奨）。

**サイドバー拡張（任意）:** プレイヤーカラーのカスタムマッピングや、ログエントリへのSVGアイコン追加が必要な場合は `packages/client/src/games/<game>/sidebarExtras.ts(x)` を作成し、`GameView.tsx` の `sidebarExtrasMap` に登録する。`getLogEntries` の `GameLogEntry.metadata` にゲーム固有データを乗せておくと `renderLogItemExtra` で参照できる。

Worker側のコード修正は不要。`GameDefinition` インターフェースを通じて自動的にゲームが動作する。

## デプロイ（Cloudflare）

```bash
# Workerをデプロイ（初回はDurable Objectのマイグレーションも自動適用）
npx wrangler deploy --config packages/worker/wrangler.toml

# フロントエンドはCloudflare Pagesにデプロイ
# ビルドコマンド: npm run build
# 出力ディレクトリ: packages/client/dist
# 環境変数（Cloudflare Pages の設定画面で入力）:
#   VITE_API_URL=https://bodobako-worker.YOUR_SUBDOMAIN.workers.dev
#   VITE_FIREBASE_API_KEY=...
#   VITE_FIREBASE_AUTH_DOMAIN=...
#   VITE_FIREBASE_PROJECT_ID=...
```

**Firebase コンソールの事前設定（初回のみ）:**

1. Firebase コンソールでプロジェクトを作成
2. Authentication > Sign-in method > Google を有効化
3. 「Authorized domains」に本番ドメインを追加
4. Firebase config を取得し、Cloudflare Pages と `.env.development` に設定

> **SPA ルーティング注意**: `packages/client/public/_redirects` に `/* /index.html 200` を記述済み。Cloudflare Pages での `/room/:code` 直アクセス・リロード時の 404 を防ぐ。

## テスト構成

### ユニット・統合テスト（Vitest）

各パッケージに独立した `vitest.config.ts` を持ち、`npm test` でまとめて実行される。

| パッケージ        | 環境                              | テスト対象                                                                                                        |
| ----------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | Node（デフォルト）                | ゲームロジック・`GameDefinition` 実装（ゲームごとに `__tests__/logic.test.ts` と `__tests__/definition.test.ts`） |
| `packages/client` | happy-dom                         | `socket.ts`（WebSocketシングルトン）・`RoomContext`（状態管理・WSイベント）                                       |
| `packages/worker` | `@cloudflare/vitest-pool-workers` | HTTP API（`POST /rooms`・`GET /rooms/:code/ws`）・RoomDO WebSocket ハンドラ                                       |

**client テストの注意点:**

- `vi.stubGlobal("WebSocket", MockWebSocket)` でネイティブWS をモック
- `vi.mock("../../lib/socket", ...)` で wsClient シングルトンを差し替え
- `RoomContext` のテストは `<MemoryRouter>` でラップして `useNavigate()` を有効化
- `import.meta.env.VITE_API_URL` は `vitest.config.ts` の `test.env` で注入
- `RoomContext.test.tsx` では `vi.mock("../../context/AuthContext", ...)` で Firebase 初期化を回避（テスト環境では env vars が空のため `auth/invalid-api-key` が発生する）

**worker テストの注意点:**

- `isolatedStorage: false`（WebSocket Hibernation API がリクエストコンテキスト外でハンドラを呼ぶため）
- `SELF.fetch()` で Workers ランタイム上の実際の HTTP リクエストを送信
- `res.webSocket!.accept()` で WS 接続を確立し、メッセージキュー（`createMsgQueue`）で受信を管理

### E2E テスト（Playwright）

`playwright.config.ts` が `npm run dev` を自動起動してからテストを実行する。テストファイルは `e2e/tests/` に配置。

| ファイル               | 内容                                            |
| ---------------------- | ----------------------------------------------- |
| `lobby.spec.ts`        | 名前入力モーダル・ゲーム一覧・localStorage 復元 |
| `room-flow.spec.ts`    | ルーム作成・コード参加・退出・直接アクセス      |
| `game-othello.spec.ts` | 2タブで対戦開始・手を打つ                       |
| `reconnect.spec.ts`    | リロード後の sessionToken 再接続                |

## エージェント利用ガイドライン

- Agent ツールでサブエージェントを起動する際は **必ず `mode: "bypassPermissions"` を指定する**
  - 指定しないとサブエージェントが Edit/Bash ツールの権限を得られず作業できない
  - worktree で並列作業させる場合も同様

## コーディング規約

- コミットメッセージは日本語（例: `feat: ロビー画面をカードベースの1画面UIにリッチ化`）
- アニメーションは `useEffect` + `<style>` タグで CSS keyframes を注入
- モーダルは fixed backdrop + blur パターン
- エラーメッセージは日本語
- ルームコードは4文字英数字（紛らわしい文字を除いた32文字から生成）
- 状態はDurable Objectのストレージに永続化（`ctx.storage.put("room", ...)`）
