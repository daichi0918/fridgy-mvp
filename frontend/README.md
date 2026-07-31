# Fridgy — frontend

冷蔵庫の**在庫・賞味期限・購入価格**を1箇所で参照できるようにするアプリ。
買い物中に「これは買うべきか」を判断する材料をその場で確認でき、重複購入と期限切れを減らすことを狙う。

frontend も backend も Next.js で作る。1プロジェクトで画面と API の両方を賄う。

---

## 🛠 技術スタック

| 項目                 | 採用                            |
| -------------------- | ------------------------------- |
| フレームワーク       | Next.js 16.2.11（App Router）   |
| UI                   | React 19.2.4                    |
| 言語                 | TypeScript 5                    |
| スタイル             | Tailwind CSS v4                 |
| Lint                 | ESLint 9 (`eslint-config-next`) |
| パッケージマネージャ | npm                             |
| DB                   | Postgres 17 ＋ Drizzle ORM      |
| 認証（予定）         | better-auth ＋ Google OAuth 2.0 |

---

## 🚀 セットアップ

```bash
npm install
npm run dev     # http://localhost:3000
```

| コマンド        | 内容                                      |
| --------------- | ----------------------------------------- |
| `npm run dev`   | 開発サーバー起動（Turbopack）             |
| `npm run build` | 本番ビルド（TypeScript の型チェック込み） |
| `npm run start` | ビルド済みアプリの起動                    |
| `npm run lint`  | ESLint                                    |

---

## 📁 ディレクトリ構成

```
frontend/
├── public/
└── src/
    ├── app/        ルート・ナビゲーション
    ├── external/   外部接続先
    ├── features/   ドメインごとのパーツ
    └── shared/     共通のパーツ
```

| ディレクトリ | 責務                            | 置くもの                                                                                                       | 置かないもの                            |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `app`        | URL と画面／APIの対応づけ       | `page.tsx` `layout.tsx` `route.ts`、feature の組み立て                                                         | ビジネスロジック                        |
| `features`   | ドメイン単位のまとまり          | 集約ごとの UI・型・ロジック・データ取得                                                                        | 他 feature への直接依存                 |
| `shared`     | 複数の feature から使う共通部品 | 汎用UI、共通型、ユーティリティ                                                                                 | ドメイン固有の知識、`features` への依存 |
| `external`   | ドメイン ＋ 外側との境界        | `domain/`（エンティティ・VO・リポジトリIF）、`client/`（DB・認証）、`handler/` `service/` `repository/` `dto/` | UI の関心事                             |

> `external` / `features` / `shared` には現在 `.gitkeep` だけが入っている。
> 実コードを追加した時点で削除してよい。

---

## 🔗 依存の向き

**これがこの構成の本題。** 名前だけ揃えても、依存が双方向になった時点で構成は崩れる。

```
        app
         │  組み立てるだけ
         ▼
      features ──────┐
         │           │
         ▼           ▼
      shared ───> external
```

| ルール                                 | 理由                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `app` はビジネスロジックを持たない     | ロジックが画面に貼りつくと、画面を変えるたびにロジックを触ることになる             |
| `features` 同士は直接 import しない    | 相互依存になると、1つの feature だけを読む・消す・差し替えることができなくなる     |
| feature をまたぐ処理は `app` で束ねる  | `docs/05_domain_design.md`「集約をまたぐ処理はアプリケーション層で調整する」に対応 |
| `shared` は `features` を知らない      | 逆流させると「共通部品」ではなくなり、結局どこからも安全に使えなくなる             |
| `external/client` はドメインを知らない | 接続先（Postgres / better-auth）を差し替えても、変更が `client/` 内で収まる        |

---

## 🧩 features の分割単位

`docs/05_domain_design.md` の**集約**をそのまま分割単位にする。設計書とコードの対応がずれないようにするため。

| ディレクトリ                 | 集約            | 対応する画面             |
| ---------------------------- | --------------- | ------------------------ |
| `features/food-item/`        | FoodItem        | F-LIST / F-FORM / F-EDIT |
| `features/store/`            | Store           | S-LIST                   |
| `features/storage-location/` | StorageLocation | SL-LIST                  |

「保存場所の固定3種（冷蔵／冷凍／常温）は削除できない」といったドメインルールは、
対応する feature の中に置く。`app` や `external` に散らさない。

---

## 🗺 app 配下のマッピング

### 画面（`docs/04_ui_design.md`）

| 画面ID     | パス               | ファイル                       |
| ---------- | ------------------ | ------------------------------ |
| AUTH-LOGIN | `/login`           | `app/login/page.tsx`           |
| F-LIST     | `/foods`           | `app/foods/page.tsx`           |
| F-FORM     | `/foods/new`       | `app/foods/new/page.tsx`       |
| F-EDIT     | `/foods/[id]/edit` | `app/foods/[id]/edit/page.tsx` |
| S-LIST     | `/stores`          | `app/stores/page.tsx`          |
| SL-LIST    | `/locations`       | `app/locations/page.tsx`       |

### API（`docs/07_api_design.md`）

Route Handlers は `app/api/` 配下に置く。

| エンドポイント                  | ファイル                                    |
| ------------------------------- | ------------------------------------------- |
| `/api/foods`                    | `app/api/foods/route.ts`                    |
| `/api/foods/:id`                | `app/api/foods/[id]/route.ts`               |
| `/api/foods/:id/change-status`  | `app/api/foods/[id]/change-status/route.ts` |
| `/api/stores` `/api/stores/:id` | `app/api/stores/...`                        |
| `/api/storage-locations`        | `app/api/storage-locations/...`             |
| `/api/users/me`                 | `app/api/users/me/route.ts`                 |

---

## 🤔 置き場所に迷ったときの判断

| 迷い                           | 判断                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| 共通で使いそうなUIができた     | まず feature の中に置く。**2つ目**の feature から使いたくなった時点で `shared` に移す |
| 食材一覧でスーパー名も出したい | `food-item` から `store` を呼ばない。`app` 側で両方を取得して渡す                     |
| DBのクエリをどこに書くか       | 接続は `external/client/`、クエリは `external/repository/`。feature 側では書かない    |
| 日付フォーマット関数           | ドメイン非依存なら `shared`                                                           |
| 「賞味期限が近い」の判定       | ドメインルールなので `features/food-item`                                             |

> 最初から共通化しない。使われるか分からないものを `shared` に置くと、後から剥がすほうが高くつく。

---

## 📚 設計ドキュメント

| ドキュメント                                                          | 内容                             |
| --------------------------------------------------------------------- | -------------------------------- |
| [`docs/01_requirements.md`](../docs/01_requirements.md)               | 背景・課題・機能要件・非機能要件 |
| [`docs/02_use_cases.md`](../docs/02_use_cases.md)                     | ユースケース                     |
| [`docs/03_ubiquitous_language.md`](../docs/03_ubiquitous_language.md) | ユビキタス言語                   |
| [`docs/04_ui_design.md`](../docs/04_ui_design.md)                     | 画面ID・パス・役割               |
| [`docs/05_domain_design.md`](../docs/05_domain_design.md)             | エンティティ・VO・集約           |
| [`docs/06_database_design.md`](../docs/06_database_design.md)         | テーブル定義・ER・削除ルール     |
| [`docs/07_api_design.md`](../docs/07_api_design.md)                   | エンドポイント・型・認可         |

---

## 📌 補足

- **パスエイリアス** — `@/*` → `src/*`（`tsconfig.json`）。`@/features/food-item/...` の形で参照する
- **Next.js 16 は破壊的変更が多い** — 実装前に `node_modules/next/dist/docs/` の該当ガイドを参照する（`AGENTS.md` 参照）
- **`npm audit` の high 警告について** — すべて `next` の推移的依存（`sharp` の libvips CVE、`postcss`）。
  `npm audit fix --force` は **next を 9.3.3 までダウングレードするので実行しないこと**。Next.js 側の更新を待つ
