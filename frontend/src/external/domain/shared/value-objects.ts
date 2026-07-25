/**
 * 共通 Value Object
 *
 * ここに置くのは「値そのものが持つルール」だけ。
 * どのエンティティが使うか、いつ変更できるかといった話はエンティティ側の責務。
 *
 * 表現の使い分け:
 *   - 変換・検証のロジックを持つもの        → class（private constructor で不正な値を作らせない）
 *   - 取りうる値の集合を制限するだけのもの  → union型 ＋ 検証関数
 *
 * @see docs/05_domain_design.md - VO（Value Object）
 * @see docs/07_api_design.md - 型定義の補足
 */

// ---------------------------------------------------------------------------
// 日付の共通処理（BestBeforeDate / PurchasedAt が使う）
// ---------------------------------------------------------------------------

/** 日付のみを表す形式。時刻もタイムゾーンも持たない */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Date を "YYYY-MM-DD" に変換する（UTC基準） */
function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" 文字列または Date を検証して Date に変換する
 *
 * 賞味期限・購入日はどちらも「日付として正しいこと」だけがルールなので処理を共通化する。
 * ただし VO 自体は別クラスに分ける（賞味期限と購入日を取り違えられないようにするため）。
 */
function parseDateOnly(value: string | Date, label: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`${label}が日付として不正です`);
    }
    // 時刻部分を切り捨てて日付のみに正規化する
    return new Date(`${formatDateOnly(value)}T00:00:00.000Z`);
  }

  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`${label}は YYYY-MM-DD 形式で指定してください: "${value}"`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label}が日付として不正です: "${value}"`);
  }

  // 2026-02-31 のような存在しない日付を弾く。
  // 環境によっては繰り上げて解釈されるため、往復させて一致を確認する。
  if (formatDateOnly(parsed) !== value) {
    throw new Error(`${label}に存在しない日付が指定されています: "${value}"`);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// FoodName（食材名）
// ---------------------------------------------------------------------------

/**
 * 食材名
 *
 * ルール: 空NG／前後空白トリム
 * 食材名は必須で意味が強いため VO にする。
 */
export class FoodName {
  private constructor(private readonly value: string) {}

  static create(value: string): FoodName {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("食材名は必須です");
    }
    return new FoodName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: FoodName): boolean {
    return this.value === other.value;
  }
}

// ---------------------------------------------------------------------------
// BestBeforeDate（賞味期限） / PurchasedAt（購入日）
// ---------------------------------------------------------------------------

/**
 * 賞味期限
 *
 * ルール: 日付として正しいこと。任意項目なので、未設定は VO ではなく null で表す。
 */
export class BestBeforeDate {
  private constructor(private readonly value: Date) {}

  static create(value: string | Date): BestBeforeDate {
    return new BestBeforeDate(parseDateOnly(value, "賞味期限"));
  }

  getValue(): Date {
    return new Date(this.value);
  }

  /** API レスポンス用の "YYYY-MM-DD" 文字列 */
  toISODateString(): string {
    return formatDateOnly(this.value);
  }

  equals(other: BestBeforeDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}

/**
 * 購入日
 *
 * ルール: 日付として正しいこと。任意項目なので、未設定は VO ではなく null で表す。
 */
export class PurchasedAt {
  private constructor(private readonly value: Date) {}

  static create(value: string | Date): PurchasedAt {
    return new PurchasedAt(parseDateOnly(value, "購入日"));
  }

  getValue(): Date {
    return new Date(this.value);
  }

  /** API レスポンス用の "YYYY-MM-DD" 文字列 */
  toISODateString(): string {
    return formatDateOnly(this.value);
  }

  equals(other: PurchasedAt): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}

// ---------------------------------------------------------------------------
// FoodStatus（食材状態）
// ---------------------------------------------------------------------------

/**
 * 食材の状態
 *
 * 未消費 / 消費中 / 消費 / 廃棄 の4種類のみ。
 * 状態「遷移」のルールは FoodItem が持つ（docs/05「状態変更は FoodItem が責任を持つ」）。
 * ここが決めるのは「取りうる値はこの4つだけ」ということだけ。
 */
export const FOOD_STATUSES = ["not_used", "in_use", "consumed", "discarded"] as const;

export type FoodStatus = (typeof FOOD_STATUSES)[number];

export const FoodStatusUtil = {
  /** 未指定時のデフォルト（docs/07「status 未指定時は not_used」） */
  DEFAULT: "not_used" satisfies FoodStatus as FoodStatus,

  isValid(value: string): value is FoodStatus {
    return (FOOD_STATUSES as readonly string[]).includes(value);
  },

  /** 外部から来た文字列を FoodStatus に変換する。不正なら例外 */
  create(value: string): FoodStatus {
    if (!FoodStatusUtil.isValid(value)) {
      throw new Error(`食材の状態が不正です: "${value}"（有効な値: ${FOOD_STATUSES.join(" / ")}）`);
    }
    return value;
  },
};

// ---------------------------------------------------------------------------
// LocationKind（保存場所の種別）
// ---------------------------------------------------------------------------

/**
 * 保存場所の種別
 *
 * default = 初期から存在する固定3種（冷蔵／冷凍／常温）
 * custom  = ユーザーが追加したもの
 *
 * 固定3種かどうかの判定は必ずこの kind で行い、名前（"冷蔵" 等）には依存させない
 * （docs/05「ロジックを名前に依存させない」）。
 */
export const LOCATION_KINDS = ["default", "custom"] as const;

export type LocationKind = (typeof LOCATION_KINDS)[number];

export const LocationKindUtil = {
  isValid(value: string): value is LocationKind {
    return (LOCATION_KINDS as readonly string[]).includes(value);
  },

  /** 外部から来た文字列を LocationKind に変換する。不正なら例外 */
  create(value: string): LocationKind {
    if (!LocationKindUtil.isValid(value)) {
      throw new Error(
        `保存場所の種別が不正です: "${value}"（有効な値: ${LOCATION_KINDS.join(" / ")}）`,
      );
    }
    return value;
  },

  isDefault(kind: LocationKind): boolean {
    return kind === "default";
  },

  isCustom(kind: LocationKind): boolean {
    return kind === "custom";
  },
};
