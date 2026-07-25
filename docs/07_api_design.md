## API構成

### エンドポイント分類

- **Query（読み取り）**: データ取得のみ。副作用なし（GET）
- **Command（書き込み）**: データの作成・更新・削除。副作用あり（POST, PUT, DELETE）

### URL設計とHTTPメソッド

| 操作     | HTTPメソッド | URLパターン           | 用途                                                 |
| -------- | ------------ | --------------------- | ---------------------------------------------------- |
| 一覧取得 | GET          | `/api/xxx`            | 全件または条件付き取得（クエリパラメータで絞り込み） |
| 単体取得 | GET          | `/api/xxx/:id`        | IDで1件取得                                          |
| 作成     | POST         | `/api/xxx`            | 新規作成                                             |
| 更新     | PUT          | `/api/xxx/:id`        | 既存更新                                             |
| 削除     | DELETE       | `/api/xxx/:id`        | 削除                                                 |
| 状態変更 | POST         | `/api/xxx/:id/action` | 状態遷移（例: `/api/foods/:id/change-status`）       |

---

# Foods（食材）API

## Query Operations

### 食材一覧取得

**URL**: `GET /api/foods`

**Request (Query Parameters)**:

```
FoodFilters{
q?:string
  status?:"not_used"|"in_use"|"consumed"|"discarded"
storeId?:string
  storageLocationId?:string
  sort?:"created_desc"|"best_before_asc"|"purchased_at_desc"
}
```

**Response**:

```
FoodResponse{
id:string
name:string
status:"not_used"|"in_use"|"consumed"|"discarded"
image?:string
  bestBeforeDate?:string// YYYY-MM-DD
  purchasedAt?:string// YYYY-MM-DD
  price?:string
  memo?:string
  store?: {
    id:string
name:string
  } |null
storageLocation: {
id:string
name:string
kind:"default"|"custom"
  }
createdAt:string// ISO 8601形式
updatedAt:string// ISO 8601形式
}

ListFoodsResponse=FoodResponse[]
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する食材のみ取得可能
- `q` は食材名の部分一致検索
- `sort` 未指定時は `created_desc`（追加順）

---

### 食材単体取得

**URL**: `GET /api/foods/:id`

**Request (URL Parameters)**:

```
id:string
```

**Response**:

```
GetFoodByIdResponse=FoodResponse|null
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する食材のみ取得可能
- 存在しない、または他人の食材の場合は `null` または 404

---

## Command Operations

### 食材作成

**URL**: `POST /api/foods`

**Request**:

```
CreateFoodRequest{
name:string
status?:"not_used"|"in_use"|"consumed"|"discarded"
image?:string
  bestBeforeDate?:string// YYYY-MM-DD
  purchasedAt?:string// YYYY-MM-DD
  price?:string
  memo?:string
  storeId?:string
storageLocationId:string
}
```

**Response**:

```
CreateFoodResponse=FoodResponse
```

**ビジネスルール**:

- 認証必須
- `name` は必須
- `storageLocationId` は必須
- `status` 未指定時は `"not_used"`
- `storeId` は任意
- 指定された `storeId` / `storageLocationId` はログインユーザーの所有物である必要がある

---

### 食材更新

**URL**: `PUT /api/foods/:id`

**Request**:

```
UpdateFoodRequest{
id:string
name:string
status:"not_used"|"in_use"|"consumed"|"discarded"
image?:string
  bestBeforeDate?:string
  purchasedAt?:string
  price?:string
  memo?:string
  storeId?:string|null
storageLocationId:string
}
```

**Response**:

```
UpdateFoodResponse=FoodResponse
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する食材のみ更新可能
- `storageLocationId` は必須
- `storeId` は `null` にして購入スーパー未設定にできる
- 指定された `storeId` / `storageLocationId` はログインユーザーの所有物である必要がある

---

### 食材状態変更

**URL**: `POST /api/foods/:id/change-status`

**Request**:

```
ChangeFoodStatusRequest{
foodId:string
status:"not_used"|"in_use"|"consumed"|"discarded"
}
```

**Response**:

```
ChangeFoodStatusResponse=FoodResponse
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する食材のみ変更可能
- `status` は定義済み4種類のみ

---

### 食材削除

**URL**: `DELETE /api/foods/:id`

**Request**:

```
DeleteFoodRequest{
id:string
}
```

**Response**:

```
DeleteFoodResponse{
success:boolean
}
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する食材のみ削除可能
- 物理削除

---

# Stores（スーパー）API

## Query Operations

### スーパー一覧取得

**URL**: `GET /api/stores`

**Request (Query Parameters)**:

```
StoreFilters{
q?:string
}
```

**Response**:

```
StoreResponse{
id:string
name:string
createdAt:string
updatedAt:string
isReferenced:boolean
}

ListStoresResponse=StoreResponse[]
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有するスーパーのみ取得可能
- `q` は店名の部分一致検索（必要になったら追加。MVPでは未使用でも可）
- `isReferenced` はいずれかの FoodItem から参照されているかを表す

---

### スーパー単体取得

**URL**: `GET /api/stores/:id`

**Request (URL Parameters)**:

```
id:string
```

**Response**:

```
GetStoreByIdResponse=StoreResponse|null
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有するスーパーのみ取得可能

---

## Command Operations

### スーパー作成

**URL**: `POST /api/stores`

**Request**:

```
CreateStoreRequest{
name:string
}
```

**Response**:

```
CreateStoreResponse=StoreResponse
```

**ビジネスルール**:

- 認証必須
- `name` は必須
- 店名は自由入力
- 同名スーパーの重複は許容

---

### スーパー更新

**URL**: `PUT /api/stores/:id`

**Request**:

```
UpdateStoreRequest{
id:string
name:string
}
```

**Response**:

```
UpdateStoreResponse=StoreResponse
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有するスーパーのみ更新可能
- `name` は必須

---

### スーパー削除

**URL**: `DELETE /api/stores/:id`

**Request**:

```
DeleteStoreRequest{
id:string
}
```

**Response**:

```
DeleteStoreResponse{
success:boolean
}
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有するスーパーのみ削除可能
- 参照中の `FoodItem` が存在する場合は削除不可
- 削除不可時はエラーを返す

---

# StorageLocations（保存場所）API

## Query Operations

### 保存場所一覧取得

**URL**: `GET /api/storage-locations`

**Request (Query Parameters)**:

```
StorageLocationFilters{
kind?:"default"|"custom"
}
```

**Response**:

```
StorageLocationResponse{
id:string
name:string
kind:"default"|"custom"
createdAt:string
updatedAt:string
isReferenced:boolean
canDelete:boolean
}

ListStorageLocationsResponse=StorageLocationResponse[]
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する保存場所のみ取得可能
- `kind` で絞り込み可能
- `canDelete` は以下で判定
  - `kind='default'` → false
  - 参照中の custom → false
  - 未参照の custom → true

---

### 保存場所単体取得

**URL**: `GET /api/storage-locations/:id`

**Request (URL Parameters)**:

```
id:string
```

**Response**:

```
GetStorageLocationByIdResponse=StorageLocationResponse|null
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する保存場所のみ取得可能

---

## Command Operations

### 保存場所作成

**URL**: `POST /api/storage-locations`

**Request**:

```
CreateStorageLocationRequest{
name:string
}
```

**Response**:

```
CreateStorageLocationResponse=StorageLocationResponse
```

**ビジネスルール**:

- 認証必須
- `name` は必須
- 新規作成時の `kind` は `"custom"`

---

### 保存場所更新

**URL**: `PUT /api/storage-locations/:id`

**Request**:

```
UpdateStorageLocationRequest{
id:string
name:string
}
```

**Response**:

```
UpdateStorageLocationResponse=StorageLocationResponse
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する保存場所のみ更新可能
- `kind='default'` の保存場所は更新不可にするなら、そのルールに従う
- 更新可否はUI仕様と合わせて最終確定する

---

### 保存場所削除

**URL**: `DELETE /api/storage-locations/:id`

**Request**:

```
DeleteStorageLocationRequest{
id:string
}
```

**Response**:

```
DeleteStorageLocationResponse{
success:boolean
}
```

**ビジネスルール**:

- 認証必須
- ログインユーザーが所有する保存場所のみ削除可能
- `kind='default'` は削除不可
- 参照中の `FoodItem` が存在する custom も削除不可

---

# Users / Auth API

## 認証の考え方

- 認証は **Google OAuth2 + Auth.js** に委譲する
- アプリケーション独自の `/api/login` `/api/signup` は作らない
- 初回ログイン時にユーザーを自動登録する

---

## アプリケーション側で持つ取得系API

### 現在のユーザー取得

**URL**: `GET /api/users/me`

**Request**: なし

**Response**:

```
CurrentUserResponse{
id:string
email:string
name?:string
  image?:string
createdAt:string
updatedAt:string
}
```

**ビジネスルール**:

- 認証必須
- ログイン中ユーザーの情報を返す

---

# ドメインモデルの関係

## エンティティの関連

```
User
  ├─ FoodItem
  │    ├─ ref → Store
  │    └─ ref → StorageLocation
  ├─ Store
  └─ StorageLocation
```

## 関係性の説明

- **User**: 認証済みユーザー。各データの所有者
- **FoodItem**: 食材本体
  - 状態・賞味期限・購入情報を持つ
  - Store / StorageLocation を参照する
- **Store**: 食材の購入先
- **StorageLocation**: 食材の保存場所

---

# 認証・認可の方針

## 認証方式

- **Google OAuth 2.0** による認証
- すべてのアプリケーションAPIは認証必須

## 認可（権限チェック）

### 1. Ownerチェック

- ログインユーザー本人のデータのみ操作可能
- 適用対象:
  - 食材の一覧 / 取得 / 作成 / 更新 / 削除 / 状態変更
  - スーパーの一覧 / 取得 / 作成 / 更新 / 削除
  - 保存場所の一覧 / 取得 / 作成 / 更新 / 削除

### 2. 状態・参照ベースの制御

**FoodItem**

- `status` は4種類のみ

**Store**

- 参照中の FoodItem がある場合は削除不可

**StorageLocation**

- `kind='default'` は削除不可
- 参照中の custom も削除不可

---

## 権限チェックの考え方

| 操作             | 認証 | Owner確認 | その他の条件                      |
| ---------------- | ---- | --------- | --------------------------------- |
| 食材一覧取得     | 必須 | 必須      | 自分の食材のみ                    |
| 食材単体取得     | 必須 | 必須      | 自分の食材のみ                    |
| 食材作成         | 必須 | 自動設定  | -                                 |
| 食材更新         | 必須 | 必須      | 自分の食材のみ                    |
| 食材状態変更     | 必須 | 必須      | status は4種類のみ                |
| 食材削除         | 必須 | 必須      | -                                 |
| スーパー一覧取得 | 必須 | 必須      | 自分のスーパーのみ                |
| スーパー更新     | 必須 | 必須      | 自分のスーパーのみ                |
| スーパー削除     | 必須 | 必須      | 参照中は削除不可                  |
| 保存場所一覧取得 | 必須 | 必須      | 自分の保存場所のみ                |
| 保存場所更新     | 必須 | 必須      | default / 参照中custom の制約あり |
| 保存場所削除     | 必須 | 必須      | default / 参照中custom は削除不可 |

---

# 型定義の補足

## 共通型

```
FoodStatus="not_used"|"in_use"|"consumed"|"discarded";
LocationKind="default"|"custom";
ISODateString=string;
```

## バリデーションルール（概念）

- `name`: 1文字以上の文字列
- `status`: 定義済み4種類のみ
- `bestBeforeDate`: 日付形式（nullable）
- `purchasedAt`: 日付形式（nullable）
- `price`: 文字列（nullable）
- `memo`: 文字列（nullable）
- `id`: UUID v4形式の文字列
