/**
 * Store（スーパー）エンティティ
 *
 * 食材の購入先として記録する店舗。Store集約の集約ルート。
 * FoodItem から storeId で参照されるマスタ。
 *
 * @see docs/05_domain_design.md - Storeチーム
 * @see docs/06_database_design.md - stores テーブル
 */
export class Store {
  /** 店名。前後の空白はトリムされ、空文字にはならないことが保証される */
  public readonly name: string;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    // 不変条件: 店名は必須（docs/06 の CHECK (trim(name) <> '') に対応）
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("店名は必須です");
    }
    this.name = trimmed;
  }

  /**
   * スーパーIDを生成する（UUID v4）
   */
  static generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 生の値から Store を組み立てる
   *
   * 店名は自由入力で、同名スーパーの重複は許容する（MVP方針）。
   * そのため一意性の検証は行わない。
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): Store {
    return new Store(params.id, params.userId, params.name, params.createdAt, params.updatedAt);
  }

  /**
   * このスーパーを操作できるか（Ownerチェック）
   *
   * @see docs/07_api_design.md - 認可（権限チェック）
   */
  canEdit(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * このスーパーを削除できるか
   *
   * 参照中の FoodItem が存在する場合は削除不可。
   * 参照の有無を数えるのはリポジトリの仕事なので、結果を受け取って判断する。
   *
   * @see docs/07_api_design.md - スーパー削除
   */
  canDelete(isReferenced: boolean): boolean {
    return !isReferenced;
  }

  /**
   * 店名を変更した新しいインスタンスを返す（自身は変更しない）
   */
  rename(name: string): Store {
    return new Store(this.id, this.userId, name, this.createdAt, new Date());
  }

  toPlainObject() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
