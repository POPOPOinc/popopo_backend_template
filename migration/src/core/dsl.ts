import { Firestore, Transaction } from "firebase-admin/firestore"

export type MigrationConf = {
  dependsOn?: Migration[]
}

/**
 * 単一 Firestore トランザクションで完結するマイグレーションを定義する。
 *
 * マイグレーション本体と完了マーカー (`/migrations/{key}`) の書き込みが
 * 1 トランザクション内で原子的に行われるため、途中でエラーが発生しても
 * 適用済みフラグだけが書かれる、といった整合性崩れは起こらない。
 *
 * ただし Firestore トランザクションは 500 writes / 10MB の上限があるため、
 * 大量の書き込みを伴う処理は {@link onMigrateBatched} を使うこと。
 */
export function onMigrate(run: (tx: Transaction) => Promise<void>, conf?: MigrationConf): Migration {
  return new Migration({ kind: "txn", run }, conf)
}

/**
 * 内部で複数のトランザクションを回せる「バッチ実行」型のマイグレーションを定義する。
 *
 * - エンジンはマイグレーション本体をトランザクションで包まず、`Firestore` インスタンスをそのまま渡す。
 * - 呼び出し側は必要に応じて `firestore.runTransaction(...)` を内部で複数回回せる。
 * - 完了マーカー (`/migrations/{key}`) は本体の完了後、別トランザクションで書き込まれる。
 * - マイグレーション本体は途中で失敗しても再実行できるように **冪等** に実装すること。
 */
export function onMigrateBatched(run: (firestore: Firestore) => Promise<void>, conf?: MigrationConf): Migration {
  return new Migration({ kind: "batched", run }, conf)
}

type MigrationBody =
  | { kind: "txn", run: (tx: Transaction) => Promise<void> }
  | { kind: "batched", run: (firestore: Firestore) => Promise<void> }

export class Migration {

  /** @private */
  key?: string

  constructor(readonly body: MigrationBody, readonly conf?: MigrationConf) {
  }
}
