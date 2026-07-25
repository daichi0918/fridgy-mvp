import type { LocationKind } from "../shared/value-objects";
import type { StorageLocation } from "./storage-location.entity";

/**
 * 保存場所一覧の絞り込み条件
 *
 * @see docs/07_api_design.md - StorageLocationFilters
 */
export interface StorageLocationFilters {
  /** default / custom で絞り込む */
  kind?: LocationKind;
}

/**
 * StorageLocation集約のリポジトリ
 *
 * ここでは「何ができるか」だけを定義し、実装は持たない。
 * 実装は external/repository/ 側に置く（依存性逆転）。
 *
 * @see docs/07_api_design.md - StorageLocations（保存場所）API
 */
export interface IStorageLocationRepository {
  /** ログインユーザーが所有する保存場所を一覧取得する */
  findMany(userId: string, filters?: StorageLocationFilters): Promise<StorageLocation[]>;

  /** IDで1件取得する。存在しない、または他人のものなら null */
  findById(id: string, userId: string): Promise<StorageLocation | null>;

  /** 作成・更新する（IDは呼び出し側が StorageLocation.generateId() で採番済み） */
  save(storageLocation: StorageLocation): Promise<StorageLocation>;

  /**
   * 物理削除する
   *
   * 削除可否の判断は StorageLocation.canDelete() で行ってから呼ぶ。
   * 固定3種はここに到達してはいけない。
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * この保存場所を参照している FoodItem の件数を返す
   *
   * StorageLocation.canDelete() に渡す `isReferenced` を求めるために使う。
   * 「数える」のはDBの仕事、「削除可否を決める」のはエンティティの仕事、と分けている。
   */
  countReferencingFoodItems(storageLocationId: string): Promise<number>;
}
