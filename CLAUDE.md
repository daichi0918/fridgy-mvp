# Fridgy — 作業規約

冷蔵庫の在庫・賞味期限・購入価格を管理する MVP。frontend も backend も Next.js。

構成・技術スタック・依存の向きは README を参照:

@frontend/README.md

このファイルには**落とし穴と作業の約束事**だけを書く。構成の説明は上の README に任せる。

---

## ⚠️ まず踏みやすい罠

### `npm` / `npx` は必ず `frontend/` で実行する

```bash
cd frontend && npm run check     # ⭕️
npx tsc --noEmit                 # ❌ ルートで叩くと事故る
```

リポジトリルートには `package.json` が無い。ルートで `npx tsc` を実行すると、
npm レジストリから **TypeScript とは無関係な `tsc@2.0.4` パッケージ**が
ダウンロードされて実行される（実際に踏んだ）。

`docker compose` だけは逆で、**リポジトリルート**で実行する（`compose.yml` がそこにある）。

### ローカルDB のポートは 5433

5432 は別プロジェクトの Postgres が常時稼働していて使えない。**そのコンテナは止めないこと。**

```bash
docker compose up -d      # 起動（リポジトリルートで）
docker compose down       # 停止。データは残る
docker compose down -v    # ⚠️ データも消える
```

### 環境変数ファイルが2つある

| ファイル | 読む人 |
| --- | --- |
| `/.env` | **docker compose だけ**（`DB_USER` `DB_PORT` など） |
| `/frontend/.env.local` | **Next.js / drizzle-kit / better-auth**（`DATABASE_URL` など） |

**Next.js は `frontend/` の外の `.env` を読まない。** 両方必要。
`.env` 内で `${DB_USER}` のような変数展開を書かないこと（docker compose は展開するが Node の dotenv はしない）。

### 生成ファイルを手で編集しない

`frontend/src/external/client/database/auth-schema.ts` は better-auth CLI の生成物。
`.claude/settings.json` の `permissions.deny` で Edit / Write をブロックしてある。

再生成はこのコマンドで行う（Bash 経由なので通る）:

```bash
cd frontend && npx @better-auth/cli generate \
  --config src/external/client/auth/auth.ts \
  --output src/external/client/database/auth-schema.ts
```

---

## ✅ 変更したら必ず実行する

```bash
cd frontend && npm run check
```

型チェック → lint → format → **依存の向きの検査**を通す。
個別に走らせたい場合は `check:types` / `check:lint` / `check:format` / `check:deps`。

`.ts` / `.md` の整形は PostToolUse hook で自動実行される（`frontend/` 配下のみ）。
`docs/` は人が書いた設計書なので自動整形しない。

---

## 📐 ドメイン層の規約（`external/domain`）

師匠のリポジトリ https://github.com/YukiOnishi1129/immortal-architecture-mvp に合わせている。

- エンティティは **immutable**。全フィールド `public readonly`、変更は新インスタンスを返す
- **コンストラクタで不変条件を検証**し、違反なら `throw`
- `static create()` がファクトリ。生の値を受け取って VO に変換する
- VO は **`private constructor` ＋ `static create()`** ＋ `getValue()` / `equals()`
- **リポジトリは interface だけ**定義する。実装は `external/repository/`（依存性逆転）
- リポジトリ interface を持つのは**集約ルートだけ**
- 所有者は `userId` ＋ `canEdit(userId)` メソッド
- **参照は必ずIDで持つ**（`storeId` / `storageLocationId`）。オブジェクトを抱えない
- `toPlainObject()` を持ち、DTO 変換に使う

### 依存ゼロを壊さない

`external/domain/` から `next` / `react` / `drizzle` / `pg` / `better-auth` を
**import してはいけない**。`npm run check:deps` が検査する。

これが守られている限り、DB もフレームワークも無い状態でドメインが動く。

### 設計書にないルールを発明しない

`docs/05_domain_design.md` は「どの値を VO にするか」を意図的に選り分けている。
一貫性を理由に勝手に増やさない（例: `StoreName` は VO にしない、と検討のうえ決定済み）。

**未確定な点**: `FoodItem.changeStatus()` は現在すべての状態遷移を許容している。
`docs` のどこにも禁止される遷移が書かれていないため。制約を入れるなら `changeStatus()` に集約する。

---

## 🗄 型の注意点（better-auth 由来）

| 対象 | 型 | 理由 |
| --- | --- | --- |
| `users.id` および全テーブルの `user_id` | **`text`** | better-auth が独自にID生成する |
| 各テーブルの `id` | `uuid` | ドメイン層が `crypto.randomUUID()` で採番 |
| 認証テーブルの日時 | `timestamp` | 生成物の仕様 |
| ドメイン3テーブルの日時 | `timestamptz` | `docs/06` 通り |

`drizzle-orm` は **`^0.45.2` 以上が必須**（better-auth の peerDependency）。

---

## 🧪 テストがまだない

`node --experimental-strip-types` は**パラメータプロパティ（`public readonly id: string`）に非対応**で
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` になる。動作確認は `tsc` でコンパイルしてから実行する:

```bash
cd frontend
./node_modules/.bin/tsc ./_check.ts --outDir /tmp/out \
  --target es2022 --module commonjs --esModuleInterop --skipLibCheck
node /tmp/out/_check.js
```

**これは応急処置。Vitest を入れるべき。** ドメイン層は依存ゼロで最もテストしやすい。

---

## 📍 進行状況

**作業を再開するときはまず `docs/_notes/build-order.md` を読む**（`.gitignore` 済み）。
師匠に教わった9ステップのビルド順と、現在どこまで進んだかが書いてある。

`docs/01`〜`07` は設計書。**実装が設計と食い違ったら設計書のほうを直す**
（これまでに認証ライブラリ・ORM・ドメインの置き場所で実施済み）。
