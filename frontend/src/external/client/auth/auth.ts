import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../database/client";
import * as schema from "../database/schema";

/**
 * better-auth インスタンス
 *
 * ⚠️ 現時点ではスキーマ生成に必要な最小構成のみ。
 * Google OAuth プロバイダはステップ7で追加する。
 *
 * @see docs/07_api_design.md - 認証の考え方
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // docs/06 と他テーブル（stores / food_items）に合わせて複数形にする
    usePlural: true,
  }),
});
