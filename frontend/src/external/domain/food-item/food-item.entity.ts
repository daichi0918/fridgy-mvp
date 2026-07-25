import {
  BestBeforeDate,
  FoodName,
  type FoodStatus,
  FoodStatusUtil,
  PurchasedAt,
} from "../shared/value-objects";

/** copyWith に渡す変更内容。省略したフィールドは現在値を引き継ぐ */
interface FoodItemChanges {
  name?: FoodName;
  status?: FoodStatus;
  storageLocationId?: string;
  storeId?: string | null;
  bestBeforeDate?: BestBeforeDate | null;
  purchasedAt?: PurchasedAt | null;
  image?: string | null;
  price?: string | null;
  memo?: string | null;
}

/**
 * 任意のテキスト項目を正規化する
 *
 * フォームから来る "" と未入力の null は利用者にとって区別がつかないため、
 * 「未設定」の表現を null に一本化する。
 */
function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * FoodItem（食材）エンティティ
 *
 * 冷蔵庫内で管理する食材1件。FoodItem集約の集約ルート。
 * 状態・期限・購入情報をまとめて扱う。
 *
 * Store / StorageLocation は **IDで参照するだけ**でオブジェクトは抱えない
 * （docs/05「参照関係はIDで持つ／親子関係にしないことでライフサイクルを分離する」）。
 *
 * @see docs/05_domain_design.md - FoodItemチーム
 * @see docs/06_database_design.md - food_items テーブル
 */
export class FoodItem {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: FoodName,
    public readonly status: FoodStatus,
    /** 保存場所への参照。必須（docs/06「storage_location_id は必須」） */
    public readonly storageLocationId: string,
    /** 購入スーパーへの参照。任意 */
    public readonly storeId: string | null,
    public readonly bestBeforeDate: BestBeforeDate | null,
    public readonly purchasedAt: PurchasedAt | null,
    public readonly image: string | null,
    /** 購入価格。MVPでは自由入力のため文字列（docs/06） */
    public readonly price: string | null,
    public readonly memo: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    // 不変条件: 食材は必ずどこかに保管されている
    if (!storageLocationId.trim()) {
      throw new Error("保存場所は必須です");
    }
  }

  /**
   * 食材IDを生成する（UUID v4）
   */
  static generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 生の値から FoodItem を組み立てる
   *
   * DBからの復元とAPIリクエストからの生成の両方で使う。
   * 文字列で渡ってくる値はここで VO に変換し、不正なら例外を投げる。
   */
  static create(params: {
    id: string;
    userId: string;
    name: string;
    /** 未指定なら "not_used"（docs/07） */
    status?: string | null;
    storageLocationId: string;
    storeId?: string | null;
    bestBeforeDate?: string | Date | null;
    purchasedAt?: string | Date | null;
    image?: string | null;
    price?: string | null;
    memo?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FoodItem {
    return new FoodItem(
      params.id,
      params.userId,
      FoodName.create(params.name),
      params.status ? FoodStatusUtil.create(params.status) : FoodStatusUtil.DEFAULT,
      params.storageLocationId,
      params.storeId ?? null,
      params.bestBeforeDate ? BestBeforeDate.create(params.bestBeforeDate) : null,
      params.purchasedAt ? PurchasedAt.create(params.purchasedAt) : null,
      normalizeOptionalText(params.image),
      normalizeOptionalText(params.price),
      normalizeOptionalText(params.memo),
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * 変更を適用した新しいインスタンスを返す
   *
   * 全13フィールドの受け渡しをここ1箇所に閉じ込める。
   * 各変更メソッドが個別に new すると、storeId と storageLocationId の
   * 取り違え（どちらも string）が起きやすいため。
   */
  private copyWith(changes: FoodItemChanges): FoodItem {
    // null許容フィールドは「null を渡された」と「省略された」を区別する必要があるため
    // ?? ではなく undefined 判定を使う
    return new FoodItem(
      this.id,
      this.userId,
      changes.name ?? this.name,
      changes.status ?? this.status,
      changes.storageLocationId ?? this.storageLocationId,
      changes.storeId !== undefined ? changes.storeId : this.storeId,
      changes.bestBeforeDate !== undefined ? changes.bestBeforeDate : this.bestBeforeDate,
      changes.purchasedAt !== undefined ? changes.purchasedAt : this.purchasedAt,
      changes.image !== undefined ? changes.image : this.image,
      changes.price !== undefined ? changes.price : this.price,
      changes.memo !== undefined ? changes.memo : this.memo,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * この食材を操作できるか（Ownerチェック）
   *
   * @see docs/07_api_design.md - 認可（権限チェック）
   */
  canEdit(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * 状態を変更する
   *
   * docs/05「状態変更は FoodItem が責任を持つ／状態遷移のルールを外に散らさない」に対応。
   *
   * ⚠️ 現時点では遷移の制約を設けていない（未消費 → 廃棄 → 消費中 なども通る）。
   * docs のどこにも禁止される遷移が定義されていないため、勝手にルールを作らない。
   * 制約を入れる場合はここに集約する。
   */
  changeStatus(status: FoodStatus): FoodItem {
    return this.copyWith({ status });
  }

  /**
   * 保存場所を移す
   *
   * docs/05「保存場所の変更は FoodItem 経由で行う」に対応。
   * 移動先が実在するか・自分の保存場所かの確認は集約をまたぐためサービス層の責務。
   */
  moveTo(storageLocationId: string): FoodItem {
    return this.copyWith({ storageLocationId });
  }

  /**
   * 内容を更新する（PUT /api/foods/:id）
   *
   * storeId に null を渡すと購入スーパーを未設定にできる（docs/07）。
   * 省略したフィールドは現在値を引き継ぐ。
   */
  update(params: {
    name?: string;
    status?: string;
    storageLocationId?: string;
    storeId?: string | null;
    bestBeforeDate?: string | Date | null;
    purchasedAt?: string | Date | null;
    image?: string | null;
    price?: string | null;
    memo?: string | null;
  }): FoodItem {
    return this.copyWith({
      name: params.name !== undefined ? FoodName.create(params.name) : undefined,
      status: params.status !== undefined ? FoodStatusUtil.create(params.status) : undefined,
      storageLocationId: params.storageLocationId,
      storeId: params.storeId,
      bestBeforeDate:
        params.bestBeforeDate !== undefined
          ? params.bestBeforeDate === null
            ? null
            : BestBeforeDate.create(params.bestBeforeDate)
          : undefined,
      purchasedAt:
        params.purchasedAt !== undefined
          ? params.purchasedAt === null
            ? null
            : PurchasedAt.create(params.purchasedAt)
          : undefined,
      image: params.image !== undefined ? normalizeOptionalText(params.image) : undefined,
      price: params.price !== undefined ? normalizeOptionalText(params.price) : undefined,
      memo: params.memo !== undefined ? normalizeOptionalText(params.memo) : undefined,
    });
  }

  toPlainObject() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name.getValue(),
      status: this.status,
      storageLocationId: this.storageLocationId,
      storeId: this.storeId,
      bestBeforeDate: this.bestBeforeDate?.toISODateString() ?? null,
      purchasedAt: this.purchasedAt?.toISODateString() ?? null,
      image: this.image,
      price: this.price,
      memo: this.memo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
