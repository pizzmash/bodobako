# ブロックス（Blocks）— shared 実装ガイド

20×20 の盤面にピースを角で繋げて配置する陣取りゲーム（2〜4人）。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `types.ts` | 型定義・定数（`BlocksState`, `BlocksMove`, `PieceDefinition` 等） |
| `pieces.ts` | 21ピースの正規形定義 & 回転×反転バリアント自動生成 |
| `bitboard.ts` | 400bit ビットボード演算ユーティリティ |
| `logic.ts` | ゲームロジック（配置判定・手番進行・スコア計算） |
| `definition.ts` | `GameDefinition<BlocksState, BlocksMove>` 実装 |
| `index.ts` | バレルファイル |

## ビットボード設計

### なぜビットボード？

20×20 = 400 マスの盤面を `bigint`（400bit）で表現する。ビット演算で配置判定（重複・辺接触・角接触）を高速に行える。

### bit 配置

```
bit位置 = row × 20 + col
bit 0   = (0,0)  左上
bit 19  = (0,19) 右上
bit 380 = (19,0) 左下
bit 399 = (19,19) 右下
```

### hex 文字列による格納

`bigint` は JSON シリアライズ不可（`JSON.stringify(1n)` → TypeError）のため、State 上は hex 文字列で保持する。ロジック関数の入口で `toBigInt(hex)` に変換し、出口で `toHex(bb)` に戻す。

```typescript
toBigInt("0")    // → 0n
toBigInt("1a3f") // → BigInt("0x1a3f")
toHex(0n)        // → "0"
```

### 隣接セル計算

辺隣接（上下左右）と角隣接（斜め4方向）をビットシフトで計算する。列端でのラップアラウンドを防ぐため、`LEFT_COL_MASK` / `RIGHT_COL_MASK` でマスクする。

```typescript
getEdgeAdjacent(bb)   // 辺隣接セル（同色辺接触禁止の検証用）
getCornerAdjacent(bb) // 角隣接セル（同色角接触必須の検証用）
```

## ピース定義

### 21ピース

1マス(×1) + 2マス(×1) + 3マス(×2) + 4マス(×5) + 5マス(×12) = 合計21ピース、89マス。

### バリアント生成

各ピースの正規形に対し、回転(0°/90°/180°/270°) × 反転(なし/水平) = 最大8変換を適用。正規化した形状で重複排除し、ユニークバリアントのみ保持する（全21ピースで合計91バリアント）。

```
回転:   rotate90CW([r, c]) = [c, -r]
反転:   flipH([r, c])      = [r, -c]
正規化: min(row)=0, min(col)=0 に平行移動してソート → 文字列キーで比較
```

### 中心座標（UI用）

各バリアントのセルは **中心(0,0)からの相対オフセット** `[dr, dc]` で保持する。中心はセル群の幾何学的重心に最も近いセルを自動選択。UIでマウスカーソル位置をピース中心に対応付けるために使用。

```typescript
// バリアントの cells 例（T-テトロミノ）
// [[-1, 0], [0, -1], [0, 0], [0, 1]]
//    ↑上       ←左     中心     右→
```

## 配置ルール

### 初手

開始角（色ごとに固定: 左上/右上/右下/左下）をカバーするようにピースを配置。

### 2手目以降

1. **重複禁止**: 既存セル（全色）と重ならない
2. **同色辺接触禁止**: `getEdgeAdjacent(pieceBB) & sameColorBB === 0n`
3. **同色角接触必須**: `getCornerAdjacent(pieceBB) & sameColorBB !== 0n`
4. **異色の辺接触は許可**

### 配置判定の流れ（`canPlace`）

```
ピース残存チェック → pieceToBitboard (bounds外ならnull)
  → 重複チェック → 初手角チェック or 辺接触禁止+角接触必須
```

## プレイヤー数と色マッピング

常に4色を使用。プレイヤー数に応じて `colorOwner` で色→プレイヤーを対応付ける。

| 人数 | `colorOwner` | 説明 |
|------|-------------|------|
| 4人 | `[0, 1, 2, 3]` | 各自1色 |
| 2人 | `[0, 1, 0, 1]` | 対角の2色を操作 |
| 3人 | `[0, 1, 2, -1]` | 色3はフリーカラー（ローテーション） |

### 3人戦フリーカラー

`colorOwner[3] === -1` のとき、その色の手番は `freeColorNextPlayer` が指すプレイヤーが操作する。操作後に `0→1→2→0…` とローテーション。

## 手番進行と自動スキップ

`applyMove` 内で次手番の有効手を自動判定する。パス move は不要。

```
applyMove → ボード更新 → ピース消費 → advanceColor
  → 次の色に有効手あり？ → Yes: その色が手番
  → No: eliminated にしてさらに次へ
  → 全色 eliminated → finished = true
```

`hasAnyValidMove` は計算コストが高い（全ピース×全バリアント×全候補位置を探索）ため、以下の枝刈りを行う:

1. **角接触候補セルの事前絞り込み**: `getCornerAdjacent(sameColor) & ~allOccupied & ~getEdgeAdjacent(sameColor)` で新ピースのセルが置けうるセルを限定
2. 候補が0なら即 false
3. 最初に合法配置が見つかった時点で即 true 返却

## スコアと勝敗

残存ピースのマス数合計が少ないプレイヤーが勝利。2人戦では2色分を合算。全員同点なら引き分け（`getRanking` → `null`）。

## テスト構成

| ファイル | テスト数 | 内容 |
|---|---|---|
| `__tests__/pieces.test.ts` | 12 | ピース数・バリアント数(91)・マス数(89)・ユニーク性 |
| `__tests__/bitboard.test.ts` | 30 | hex変換・マスク定数・隣接セル計算・ラップアラウンド防止 |
| `__tests__/logic.test.ts` | 42 | canPlace・hasAnyValidMove・getValidPlacements・advanceColor・applyMove・スコア・boardToGrid |
| `__tests__/definition.test.ts` | 28 | GameDefinition インターフェース準拠・parseMove 型ガード・統合フロー |
