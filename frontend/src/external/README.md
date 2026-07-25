# external — 外部接続先

アプリの外側にあるもの（DB、認証、外部API）との接続を、ここに閉じ込める。

---

## ⭐ 運用ルール

### 1. handler の構成は CQRS の方針（キャッシュはしないけど）

1. read と write で処理を分ける
2. read はキャッシュを読み込むだけ
3. write は DB とキャッシュを書き込む

### 2. handler は Server Actions と Server Functions で分ける

### 3. client からは handler の Server Action のみを呼び出し、server からは Server Functions を呼び出す

```
client component ──> handler の Server Action
server component ──> handler の Server Function
```

### 4. external 以外からは、external/handler 以外は呼び出してはダメ

```
app / features / shared
        │
        ▼
  external/handler/      ← ここだけが公開の入口
        │
        ▼
  external の内部実装     ← 外から直接触らない
```

---

## 📌 補足

このルールは実装しながら詰めていく。詰まった時点で見直す。

- **用語について** — Next.js 16 の公式ドキュメント上は
  「Server Action は React Server Function の一種（`<form action>` などの action 機構経由で呼ばれるもの）」
  と定義されている。ルール2・3の区別を実装に落とすときは
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` を確認する
- **`'use server'` は公開エンドポイントになる** — UIを経由しないリクエストを直接送れるため、
  Server Action の中では認証・認可・入力検証を必ず行う（`docs/07_api_design.md` の Owner チェック）
