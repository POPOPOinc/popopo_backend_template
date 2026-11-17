import { readFileSync } from "fs"
import { resolve } from "path"
import { FirestorePaths } from "../../schema/src/firestore-paths"

// Firebase Extension の instance ID は 46 文字未満である必要がある
const MAX_INSTANCE_ID_LENGTH = 45

// BigQuery に export しないコレクション（FirestorePaths の path を {id} でつないだもの）。足すときは理由を書く
const EXCLUDED_COLLECTION_PATHS: Record<string, string> = {
  "users/{id}/settings": "クライアントの設定で、分析に使わない",
  "app-configs": "運用の設定で、件数も少ない",
  "migrations": "マイグレーションの適用記録",
  "admins": "管理者のアカウント",
  "admin-operations": "監査ログ。必要になったら export する",
  "tasks": "処理が終わると消える一時的なキュー",
}

/** FirestorePaths をたどり、コレクションのパス（例: users/{id}/settings）を集める */
function collectCollectionPaths(node: object, parent: string | null = null): string[] {
  return Object.values(node).flatMap(child => {
    if (child === null || typeof child !== "object" || !("path" in child) || typeof child.path !== "string") {
      return []
    }
    const path = parent === null ? child.path : `${parent}/{id}/${child.path}`
    return [path, ...collectCollectionPaths(child, path)]
  })
}

/** firebase.json の BigQuery Export Extension と、その env の COLLECTION_PATH（{xxx} を {id} にそろえる） */
function getBigQueryExports(): { instanceId: string, collectionPath: string }[] {
  const firebaseJson = JSON.parse(readFileSync(resolve(__dirname, "../firebase.json"), "utf-8")) as { extensions?: Record<string, string> }
  return Object.entries(firebaseJson.extensions ?? {})
    .filter(([, ref]) => ref.startsWith("firebase/firestore-bigquery-export@"))
    .map(([instanceId]) => {
      const env = readFileSync(resolve(__dirname, `../extensions/${instanceId}.env`), "utf-8")
      const collectionPath = env.split("\n").map(line => line.split("=")).find(([key]) => key === "COLLECTION_PATH")?.[1]?.trim()
      if (!collectionPath) {
        throw new Error(`extensions/${instanceId}.env に COLLECTION_PATH がありません`)
      }
      return { instanceId, collectionPath: collectionPath.replace(/\{[^}]+\}/g, "{id}") }
    })
}

describe("BigQuery Export Extension", () => {
  const exports = getBigQueryExports()
  const collectionPaths = collectCollectionPaths(FirestorePaths)

  test.each(collectionPaths)("%s は export するか、除外リストに入っている", collectionPath => {
    const exported = exports.some(e => e.collectionPath === collectionPath)
    expect(exported || collectionPath in EXCLUDED_COLLECTION_PATHS).toBe(true)
  })

  test("除外リストに、FirestorePaths にないパスや export しているパスが残っていない", () => {
    for (const excluded of Object.keys(EXCLUDED_COLLECTION_PATHS)) {
      expect(collectionPaths).toContain(excluded)
      expect(exports.map(e => e.collectionPath)).not.toContain(excluded)
    }
  })

  test.each(exports.map(e => e.instanceId))("instance ID %s は 46 文字未満", instanceId => {
    expect(instanceId.length).toBeLessThanOrEqual(MAX_INSTANCE_ID_LENGTH)
  })
})
