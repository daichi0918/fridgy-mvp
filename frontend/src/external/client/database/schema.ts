import { desc, sql } from "drizzle-orm";
import { check, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth-schema";

/**
 * 認証テーブル（users / sessions / accounts / verifications）
 *
 * ⚠️ auth-schema.ts は better-auth CLI の生成物。手で編集しないこと。
 *    再生成コマンド:
 *      npx @better-auth/cli generate \
 *        --config src/external/client/auth/auth.ts \
 *        --output src/external/client/database/auth-schema.ts
 */
export * from "./auth-schema";

/**
 * ドメインテーブル
 *
 * @see docs/06_database_design.md
 *
 * 認証テーブルとの型の違いに注意:
 *   - users.id は better-auth の規約で `text`。よって user_id も `text` にする
 *   - 各テーブルの id は docs/06 通り `uuid`（ドメイン層が crypto.randomUUID() で採番）
 *   - 日時は docs/06 通り `timestamptz`（生成された認証テーブルは `timestamp`）
 */

// ---------------------------------------------------------------------------
// stores（スーパー）
// ---------------------------------------------------------------------------

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      // 所有関係なのでユーザー削除時に一緒に消す
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stores_user_id_idx").on(table.userId),
    check("stores_name_not_empty", sql`trim(${table.name}) <> ''`),
  ],
);

// ---------------------------------------------------------------------------
// storage_locations（保存場所）
// ---------------------------------------------------------------------------

export const storageLocations = pgTable(
  "storage_locations",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 'default'（固定3種）または 'custom'（ユーザー追加） */
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("storage_locations_user_id_idx").on(table.userId),
    check("storage_locations_name_not_empty", sql`trim(${table.name}) <> ''`),
    check("storage_locations_kind_valid", sql`${table.kind} in ('default', 'custom')`),
  ],
);

// ---------------------------------------------------------------------------
// food_items（食材）
// ---------------------------------------------------------------------------

export const foodItems = pgTable(
  "food_items",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** not_used / in_use / consumed / discarded */
    status: text("status").notNull(),
    image: text("image"),
    /** mode: "string" で "YYYY-MM-DD" として読み書きする（BestBeforeDate VO の入力形式と一致） */
    bestBeforeDate: date("best_before_date", { mode: "string" }),
    purchasedAt: date("purchased_at", { mode: "string" }),
    /** MVPでは自由入力のため text（docs/06） */
    price: text("price"),
    memo: text("memo"),
    /**
     * 購入スーパーへの参照。任意。
     * 集約をまたぐ参照なので CASCADE しない（Store削除でFoodItemを消さない）。
     * 参照中のStoreは削除不可というルールをアプリ側で守る前提。
     */
    storeId: uuid("store_id").references(() => stores.id),
    /**
     * 保存場所への参照。必須。
     * 同じく CASCADE しない。参照中の保存場所は削除不可。
     */
    storageLocationId: uuid("storage_location_id")
      .notNull()
      .references(() => storageLocations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // docs/06 の索引。docs/07 の sort / filter に対応させている
    index("food_items_user_id_idx").on(table.userId),
    index("food_items_user_id_status_idx").on(table.userId, table.status),
    index("food_items_storage_location_id_idx").on(table.storageLocationId),
    index("food_items_store_id_idx").on(table.storeId),
    // sort=best_before_asc
    index("food_items_user_id_best_before_date_idx").on(table.userId, table.bestBeforeDate),
    // sort=purchased_at_desc
    index("food_items_user_id_purchased_at_idx").on(table.userId, desc(table.purchasedAt)),
    // sort=created_desc（既定）
    index("food_items_user_id_created_at_idx").on(table.userId, desc(table.createdAt)),
    check("food_items_name_not_empty", sql`trim(${table.name}) <> ''`),
    check(
      "food_items_status_valid",
      sql`${table.status} in ('not_used', 'in_use', 'consumed', 'discarded')`,
    ),
  ],
);
