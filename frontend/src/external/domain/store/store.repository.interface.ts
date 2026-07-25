import type { Store } from "./store.entity";

/**
 * スーパー一覧の絞り込み条件
 *
 * @see docs/07_api_design.md - StoreFilters
 */
export interface StoreFilters {
  /** 店名の部分一致検索 */
  q?: string;
}

/**
 * Store集約のリポジトリ
 *
 * ここでは「何ができるか」だけを定義し、実装は持たない。
 * 実装は external/repository/ 側に置く（依存性逆転）。
 * これによりドメイン層は DB を一切知らずに済む。
 *
 * @see docs/07_api_design.md - Stores（スーパー）API
 */
export interface IStoreRepository {
  /** ログインユーザーが所有するスーパーを一覧取得する */
  findMany(userId: string, filters?: StoreFilters): Promise<Store[]>;

  /** IDで1件取得する。存在しない、または他人のものなら null */
  findById(id: string, userId: string): Promise<Store | null>;

  /** 作成・更新する（IDは呼び出し側が Store.generateId() で採番済み） */
  save(store: Store): Promise<Store>;

  /** 物理削除する。削除可否の判断は Store.canDelete() で行ってから呼ぶ */
  delete(id: string, userId: string): Promise<void>;

  /**
   * このスーパーを参照している FoodItem の件数を返す
   *
   * Store.canDelete() に渡す `isReferenced` を求めるために使う。
   * 「数える」のはDBの仕事、「削除可否を決める」のはエンティティの仕事、と分けている。
   */
  countReferencingFoodItems(storeId: string): Promise<number>;
}
