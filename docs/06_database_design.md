# データベース設計書

## 📦 テーブルとカラム（PK / FK付き）

### 1) users（ユーザー）

| カラム         | 型        | 説明                            |
| -------------- | --------- | ------------------------------- |
| id (PK)        | text      | ユーザーID                      |
| name           | text      | 表示名                          |
| email          | text      | メールアドレス                  |
| email_verified | boolean   | メール確認済みフラグ            |
| image          | text      | プロフィール画像URL（nullable） |
| created_at     | timestamp | 作成日時                        |
| updated_at     | timestamp | 更新日時                        |

### 制約

- `UNIQUE(email)`

### 補足

- 本システムでは認証に **better-auth** を採用する
- 認証方式は Googleログイン / ログアウト / 初回登録（OAuth2）とする
- 初回ログイン時に、Googleアカウント情報をもとにユーザーを自動登録する
- OAuth前提のため `password` は保持しない
- **この表は better-auth が生成するスキーマに従う。手で定義しない**
  - 生成コマンド: `npx @better-auth/cli generate --config src/external/client/auth/auth.ts --output src/external/client/database/auth-schema.ts`
  - 補助テーブルとして `sessions` / `accounts` / `verifications` が同時に生成される
- **他テーブルと型が異なる点に注意**
  - `id` は `uuid` ではなく `text`（better-auth が独自にID生成するため）。
    よって `stores` などの `user_id` も `text` にする
  - 日時は `timestamptz` ではなく `timestamp`（生成物の仕様）。
    ドメイン3テーブルは `timestamptz` のままとする

---

### 2) stores（スーパー）

| カラム                | 型          | 説明         |
| --------------------- | ----------- | ------------ |
| id (PK)               | uuid        | スーパーID   |
| user_id (FK→users.id) | text        | 所有ユーザー |
| name                  | text        | 店名         |
| created_at            | timestamptz | 作成日時     |
| updated_at            | timestamptz | 更新日時     |

### 制約

- `CHECK (trim(name) <> '')`

### 索引

- `INDEX(user_id)`

### 補足

- 店名は自由入力
- MVPでは同名スーパーの重複を許容するため `UNIQUE(user_id, name)` は付けない

---

### 3) storage_locations（保存場所）

| カラム                | 型          | 説明             |
| --------------------- | ----------- | ---------------- |
| id (PK)               | uuid        | 保存場所ID       |
| user_id (FK→users.id) | text        | 所有ユーザー     |
| name                  | text        | 保存場所名       |
| kind                  | text        | default / custom |
| created_at            | timestamptz | 作成日時         |
| updated_at            | timestamptz | 更新日時         |

### 制約

- `CHECK (trim(name) <> '')`
- `CHECK (kind IN ('default', 'custom'))`

### 索引

- `INDEX(user_id)`

### 補足

- 初期データとして `冷蔵 / 冷凍 / 常温` を `kind='default'` で投入する
- 固定3種の削除不可はアプリケーション層でも制御する

---

### 4) food_items（食材）

| カラム                                        | 型          | 説明                                      |
| --------------------------------------------- | ----------- | ----------------------------------------- |
| id (PK)                                       | uuid        | 食材ID                                    |
| user_id (FK→users.id)                         | text        | 所有ユーザー                              |
| name                                          | text        | 食材名（空NG）                            |
| status                                        | text        | 食材状態（未消費 / 消費中 / 消費 / 廃棄） |
| image                                         | text        | 画像URL or パス（nullable）               |
| best_before_date                              | date        | 賞味期限（nullable）                      |
| purchased_at                                  | date        | 購入日（nullable）                        |
| price                                         | text        | 購入価格（nullable / MVPでは自由入力）    |
| memo                                          | text        | メモ（nullable）                          |
| store_id (FK→stores.id)                       | uuid        | 購入スーパー（nullable）                  |
| storage_location_id (FK→storage_locations.id) | uuid        | 保存場所                                  |
| created_at                                    | timestamptz | 作成日時                                  |
| updated_at                                    | timestamptz | 更新日時                                  |

### 制約

- `CHECK (trim(name) <> '')`
- `CHECK (status IN ('not_used', 'in_use', 'consumed', 'discarded'))`

### 索引

- `INDEX(user_id)`
- `INDEX(user_id, status)`
- `INDEX(storage_location_id)`

(

- `INDEX(user_id, best_before_date)`
- `INDEX(user_id, purchased_at DESC)`
- `INDEX(user_id, created_at DESC)`
- `INDEX(store_id)`

)

### 補足

- `status` は FoodStatus VO を text で保持
- `price` は MVPでは自由入力のため `text`
- `storage_location_id` は必須
- `store_id` は任意

---

## 🗺️ つながり図（ERダイアグラム：関係）

```
users (ユーザー)
 ├─< stores (スーパー)
 ├─< storage_locations (保存場所)
 └─< food_items (食材)
         ├─→ stores
         └─→ storage_locations
```

### 関係の意味

- `users 1 ─< stores`
  - 1ユーザーが複数のスーパーを持つ
- `users 1 ─< storage_locations`
  - 1ユーザーが複数の保存場所を持つ
- `users 1 ─< food_items`
  - 1ユーザーが複数の食材を持つ
- `food_items ─→ stores`
  - 食材は任意で購入スーパーを参照する
- `food_items ─→ storage_locations`
  - 食材は必ず保存場所を参照する

---

# 🔒 集約とトランザクション境界

## 集約境界の定義

このプロジェクトでは、以下の3つの集約を定義する。

### 1. FoodItem集約（食材チーム）

集約ルート: `food_items`

```
food_items
  ├─ status（VO）
  ├─ best_before_date（VO）
  ├─ purchased_at（VO）
  ├─ store_id（外部集約参照）
  └─ storage_location_id（外部集約参照）
```

- FoodItem は単一テーブルで完結する
- Store / StorageLocation は参照のみ
- 状態・期限・購入情報は FoodItem の中で一体として扱う
- トランザクション境界 = FoodItem集約

---

### 2. Store集約（スーパーチーム）

集約ルート: `stores`

```
stores
```

- 単一エンティティで完結
- FoodItem から参照されるマスタ
- トランザクション境界 = Store集約

---

### 3. StorageLocation集約（保存場所チーム）

集約ルート: `storage_locations`

```
storage_locations
```

- 単一エンティティで完結
- `kind = default / custom` を持つ
- 固定3種の削除不可ルールをここで守る
- トランザクション境界 = StorageLocation集約

---

## トランザクション制御のルール

### ✅ 同一集約内の操作（1トランザクション）

### FoodItem集約の操作例

- 食材作成
- 状態変更
- 保存場所変更
- 購入情報更新
- 食材削除

### Store集約の操作例

- スーパー作成
- スーパー名更新
- スーパー削除

### StorageLocation集約の操作例

- 保存場所作成
- 保存場所名更新
- 保存場所削除（customのみ）

---

### ⚠️ 集約をまたぐ操作（別トランザクション）

異なる集約は別々のトランザクションで操作する。

### 例

- Store作成 → その後 FoodItem で `store_id` を設定
- StorageLocation作成 → その後 FoodItem で `storage_location_id` を設定

これらは連続したUXではあっても、1つの集約として同時更新しない。

---

## 集約境界設計の原則

### 集約内の整合性

- FoodItem / Store / StorageLocation はそれぞれ独立して更新する
- 他集約の内部状態を直接変更しない

### 集約間の結合度

- 他の集約への参照は ID のみ（外部キー）
- 集約をまたぐ処理はアプリケーション層で調整する

### トランザクション = 集約

- 1トランザクション = 1集約の操作
- 複数集約にまたがる整合性はアプリケーション層で保証する

---

# 集約のライフサイクル（ON DELETE の考え方）

今回の設計では、**同一集約内の子テーブルが存在しない**ため、`ON DELETE CASCADE` は基本不要。

## 関係ごとの方針

| 関係                           | CASCADE設定 | 理由                                                       |
| ------------------------------ | ----------- | ---------------------------------------------------------- |
| users → food_items             | あり        | 所有関係。ユーザー削除時はアプリケーション層で制御         |
| users → stores                 | あり        | 所有関係。ユーザー削除時はアプリケーション層で制御         |
| users → storage_locations      | あり        | 所有関係。ユーザー削除時はアプリケーション層で制御         |
| stores → food_items            | なし        | 集約をまたぐ参照。Store削除時にFoodItemを自動削除しない    |
| storage_locations → food_items | なし        | 集約をまたぐ参照。Location削除時にFoodItemを自動削除しない |

---

## 削除時のルール

### users 削除時

- `users` に紐づく `food_items` / `stores` / `storage_locations` は自動削除する
- これは所有関係であり、ユーザー削除後にデータを残す必要がないため
- `users → food_items`
- `users → stores`
- `users → storage_locations`
  には **`ON DELETE CASCADE`** を設定する

---

### stores 削除時

- 参照中の `food_items.store_id` がある場合、その `Store` は削除不可とする
- 削除前に、その `Store` を参照している `FoodItem` が存在しないことを確認する

理由：

- `Store` は `FoodItem` の購入情報の一部であり、参照中の `Store` を削除すると食材データの意味が欠けるため
- 関連する `FoodItem` の `store_id` を自動で `NULL` にするより、削除不可とした方がルールが明確である

---

### storage_locations 削除時

- `kind='default'` は削除不可
- `kind='custom'` でも、参照中の `food_items.storage_location_id` がある場合は削除不可にするのが自然

理由：

- `FoodItem` は保存場所必須
- `storage_location_id` を `NULL` にできない
- Location削除で参照切れを起こすと整合性が壊れるため

---

## 原則

- **所有関係** である `users → food_items / stores / storage_locations` には `ON DELETE CASCADE` を使用する
- **集約をまたぐ参照関係** である `stores → food_items`、`storage_locations → food_items` には `ON DELETE CASCADE` を使用しない
- `stores` / `storage_locations` 削除時の整合性は、DB制約とアプリケーション層で制御する
