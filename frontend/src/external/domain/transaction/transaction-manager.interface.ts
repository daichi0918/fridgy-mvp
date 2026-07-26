/**
 * トランザクション管理のインターフェース
 *
 * サービス層が DB の実装（Drizzle / pg など）に依存しないようにするための抽象化。
 * 実装は external/client/database/ 側に置く。
 *
 * ## このプロジェクトでのトランザクションの単位
 *
 * **集約の境界 = トランザクション境界**（docs/05）。
 * 1トランザクションで扱うのは1集約の操作だけにする。
 *
 * | 対象 | トランザクション |
 * | --- | --- |
 * | FoodItem / Store / StorageLocation の作成・更新・削除 | 必要 |
 * | 一覧取得などの読み取り専用クエリ | 不要 |
 *
 * 集約をまたぐ操作（例: Store を作ってから FoodItem の storeId に設定する）は、
 * 連続した UX であっても**別トランザクション**にする。
 * 整合性はアプリケーション層で調整する。
 *
 * @see docs/05_domain_design.md - 集約境界とトランザクション境界
 * @see docs/06_database_design.md - 集約とトランザクション境界
 */
export interface ITransactionManager<TxType = unknown> {
  /**
   * トランザクション内でコールバックを実行する
   *
   * コールバックが例外を投げた場合はロールバックし、その例外をそのまま呼び出し元へ伝える。
   * 正常終了した場合はコミットし、コールバックの戻り値を返す。
   *
   * @param callback トランザクション内で実行する処理。引数の tx をリポジトリに渡す
   * @returns コールバックの戻り値
   */
  execute<T>(callback: (tx: TxType) => Promise<T>): Promise<T>;
}
