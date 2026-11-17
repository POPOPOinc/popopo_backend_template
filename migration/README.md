# migration

Firestore 等のデータ初期化・スキーマ変更・バックフィル等を「マイグレーション」として管理・適用する仕組みです。

## 実行方法

### ローカル

※ 前もって Firebase Emulator を起動しておく必要があります。

```shell
pnpm run apply:emulator
```

## マイグレーションの仕組み

マイグレーションは以下のようなスクリプトとして表現されます。

```typescript
import { firestore } from "#config"
import { onMigrate } from "#core/dsl"

export const initialUsers = onMigrate(async tx => {
  tx.create(firestore.doc("users/test_user"), { name: "test" })
})
```

_migration_ は[ここ](./migrations)に配置された .ts スクリプトをすべて読み込み、対象の環境において未実行の `onMigrate` を見つけてそれを呼び出します。

特定の `onMigrate` が実行されると、対象の環境に対応した Firestore のドキュメント `/migrations/{name}` (e.g. `/migrations/initialUsers`) が作成されます。このドキュメントが既に作成されている場合は `onMigrate`
の実行はスキップされます。


### マイグレーション間の依存関係

`onMigrate()` の第二引数にはオプションで `dependsOn` というパラメーターが用意されており、ここに他の `onMigrate` の結果を列挙することでマイグレーションに実行順序を設定できます。

```typescript
export const initialPosts = onMigrate(async tx => {
  tx.create(firestore.doc("posts/test"), {})
})

export const initialComments = onMigrate(async tx => {
  tx.create(firestore.doc("posts/test/comments/1"), {})
}, { dependsOn: [initialPosts, initialUsers] })
```

これは、開発中に新たなマイグレーションを追加するとき、それが別の古いマイグレーションの適用を前提とするようなものである場合に利用します。
