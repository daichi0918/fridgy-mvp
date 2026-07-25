import { type LocationKind, LocationKindUtil } from "../shared/value-objects";

/**
 * StorageLocation（保存場所）エンティティ
 *
 * 食材の保管場所。StorageLocation集約の集約ルート。
 * FoodItem から storageLocationId で参照される（FoodItem 側は必須）。
 *
 * このエンティティの中心的な責務は「固定3種の制約を守ること」。
 *
 * @see docs/05_domain_design.md - StorageLocationチーム
 * @see docs/06_database_design.md - storage_locations テーブル
 */
export class StorageLocation {
  /** 保存場所名。前後の空白はトリムされ、空文字にはならないことが保証される */
  public readonly name: string;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    name: string,
    public readonly kind: LocationKind,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    // 不変条件: 保存場所名は必須（docs/06 の CHECK (trim(name) <> '') に対応）
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("保存場所名は必須です");
    }
    this.name = trimmed;
  }

  /**
   * 保存場所IDを生成する（UUID v4）
   */
  static generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 既存データ（DB）から復元する
   *
   * kind は文字列で渡ってくるため、ここで検証して LocationKind に変換する。
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    kind: string;
    createdAt: Date;
    updatedAt: Date;
  }): StorageLocation {
    return new StorageLocation(
      params.id,
      params.userId,
      params.name,
      LocationKindUtil.create(params.kind),
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * ユーザーが新しく追加する保存場所を作る
   *
   * kind は必ず "custom" になる。この入口からは default を作れないため、
   * 「新規作成時の kind は custom」（docs/07）が構造的に保証される。
   */
  static createCustom(params: {
    id: string;
    userId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): StorageLocation {
    return new StorageLocation(
      params.id,
      params.userId,
      params.name,
      "custom",
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * この保存場所を操作できるか（Ownerチェック）
   *
   * @see docs/07_api_design.md - 認可（権限チェック）
   */
  canEdit(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * 固定3種（冷蔵／冷凍／常温）かどうか
   *
   * 名前ではなく kind で判定する。
   */
  isDefault(): boolean {
    return LocationKindUtil.isDefault(this.kind);
  }

  /**
   * この保存場所を削除できるか
   *
   * - kind='default'  → 参照の有無に関係なく不可（保存場所が消えて食材が参照不能になる事故を防ぐ）
   * - 参照中の custom → 不可（FoodItem は保存場所必須なので参照切れを起こせない）
   * - 未参照の custom → 可
   *
   * 参照の有無を数えるのはリポジトリの仕事なので、結果を受け取って判断する。
   *
   * @see docs/07_api_design.md - 保存場所削除 / canDelete の判定
   */
  canDelete(isReferenced: boolean): boolean {
    if (this.isDefault()) {
      return false;
    }
    return !isReferenced;
  }

  /**
   * 名称を変更できるか
   *
   * 固定3種は名称変更不可（docs/01「上記3つは削除・名称変更不可（固定）」）。
   */
  canRename(): boolean {
    return !this.isDefault();
  }

  /**
   * 名称を変更した新しいインスタンスを返す（自身は変更しない）
   *
   * UI 側は canRename() でボタンを制御する想定だが、
   * ここでも防いでおく（UIを経由しない呼び出しがあり得るため）。
   */
  rename(name: string): StorageLocation {
    if (!this.canRename()) {
      throw new Error("固定の保存場所（冷蔵／冷凍／常温）は名称を変更できません");
    }
    return new StorageLocation(this.id, this.userId, name, this.kind, this.createdAt, new Date());
  }

  toPlainObject() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      kind: this.kind,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
