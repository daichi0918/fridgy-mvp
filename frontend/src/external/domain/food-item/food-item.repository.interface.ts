import type { FoodStatus } from "../shared/value-objects";
import type { FoodItem } from "./food-item.entity";

/**
 * 食材一覧の並び順
 *
 * 未指定時は created_desc（追加順）。
 *
 * @see docs/07_api_design.md - FoodFilters
 * @see docs/01_requirements.md - 並び替え：賞味期限が近い順 / 購入日が新しい順
 */
export const FOOD_SORT_ORDERS = ["created_desc", "best_before_asc", "purchased_at_desc"] as const;

export type FoodSortOrder = (typeof FOOD_SORT_ORDERS)[number];

/**
 * 食材一覧の絞り込み条件
 *
 * @see docs/07_api_design.md - FoodFilters
 */
export interface FoodFilters {
  /** 食材名の部分一致検索 */
  q?: string;
  status?: FoodStatus;
  storeId?: string;
  storageLocationId?: string;
  /** 未指定時は created_desc */
  sort?: FoodSortOrder;
}

/**
 * FoodItem集約のリポジトリ
 *
 * ここでは「何ができるか」だけを定義し、実装は持たない。
 * 実装は external/repository/ 側に置く（依存性逆転）。
 *
 * @see docs/07_api_design.md - Foods（食材）API
 */
export interface IFoodItemRepository {
  /** ログインユーザーが所有する食材を一覧取得する */
  findMany(userId: string, filters?: FoodFilters): Promise<FoodItem[]>;

  /** IDで1件取得する。存在しない、または他人のものなら null */
  findById(id: string, userId: string): Promise<FoodItem | null>;

  /** 作成・更新する（IDは呼び出し側が FoodItem.generateId() で採番済み） */
  save(foodItem: FoodItem): Promise<FoodItem>;

  /** 物理削除する（docs/01「食材を編集・削除できる（物理削除）」） */
  delete(id: string, userId: string): Promise<void>;
}
