import { config } from "#config"
import { onMigrateBatched } from "#core/dsl"
import { FirestorePaths, PostDocuments, PostId, UserId } from "schema"
import { initialLocalAdmin } from "./initial-admin"

const SEED_POST_COUNT = 30
const BATCH_SIZE = 10

/**
 * ローカル開発用のサンプル投稿を作成する。エミュレータ以外では何もしない。
 * 書き込みの多いマイグレーションの例として、onMigrateBatched でトランザクションを分けて書く。
 * 投稿 ID を固定しているので、途中で失敗しても再実行で同じ結果になる（冪等）。
 */
export const seedLocalPosts = onMigrateBatched(async firestore => {
  if (!config.isEmulator) {
    return
  }
  const author = { id: UserId("local-admin"), display_name: "Local Admin" }
  const now = Date.now()
  for (let start = 0; start < SEED_POST_COUNT; start += BATCH_SIZE) {
    await firestore.runTransaction(async tx => {
      for (let i = start; i < Math.min(start + BATCH_SIZE, SEED_POST_COUNT); i++) {
        const id = PostId(`local-seed-${String(i + 1).padStart(3, "0")}`)
        const createdAt = now - i * 60_000
        tx.set(firestore.doc(FirestorePaths.Posts.getDocPath(id)), PostDocuments.toDocumentData({
          id,
          user_id: author.id,
          author,
          body: `サンプル投稿 ${i + 1}`,
          display_period: { start_at: createdAt, end_at: null },
          display_period_state: { active: true, next_change_at: null },
          created_at: createdAt,
          updated_at: createdAt,
        }))
      }
    })
  }
}, { dependsOn: [initialLocalAdmin] })
