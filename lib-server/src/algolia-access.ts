import { algoliasearch, type Algoliasearch } from "algoliasearch"
import type { PostDocument, PostId, UserDocument, UserId } from "schema"
import { logger } from "./logger/log"

type CustomRanking = { direction: "asc" | "desc", column: string }

// インデックス名は先頭のソート条件のみを使用する（customRanking には全ての条件が適用される）
const replicaIndexName = (prefix: string, value: CustomRanking[]): string => {
  const first = value[0]
  if (!first) {
    throw new Error("CustomRanking must not be empty")
  }
  return `${prefix}--${first.direction}:${first.column}`
}

/**
 * Algolia アクセスのインターフェース。
 * 本番では AlgoliaAccess、エミュレータ環境では FakeAlgoliaAccess を使う
 */
export interface AlgoliaAccessLike {
  saveUsers(docs: UserDocument[]): Promise<void>
  deleteUsers(ids: UserId[]): Promise<void>
  savePosts(docs: PostDocument[]): Promise<void>
  deletePosts(ids: PostId[]): Promise<void>
  setIndexSettings(): Promise<unknown[]>
}

export class AlgoliaAccess implements AlgoliaAccessLike {

  private readonly client: Algoliasearch
  private readonly usersIndexName: string
  private readonly postsIndexName: string

  private readonly usersIndexSorts: CustomRanking[][] = [
    [{ direction: "desc", column: "created_at" }],
  ]

  private readonly postsIndexSorts: CustomRanking[][] = [
    [{ direction: "desc", column: "created_at" }],
    [{ direction: "asc", column: "created_at" }],
  ]

  constructor(appId: string, apiKey: string, private readonly indexPrefix = "", host?: string) {
    this.client = host
      ? algoliasearch(appId, apiKey, { hosts: [{ url: host, accept: "readWrite", protocol: "http" }] })
      : algoliasearch(appId, apiKey)
    this.usersIndexName = `${indexPrefix}users`
    this.postsIndexName = `${indexPrefix}posts`
  }

  async saveUsers(docs: UserDocument[]): Promise<void> {
    await this.client.saveObjects({
      indexName: this.usersIndexName,
      objects: docs.map(doc => ({ objectID: doc.id, display_name: doc.display_name, created_at: doc.created_at })),
    })
  }

  async deleteUsers(ids: UserId[]): Promise<void> {
    await this.client.deleteObjects({ indexName: this.usersIndexName, objectIDs: ids })
  }

  async savePosts(docs: PostDocument[]): Promise<void> {
    await this.client.saveObjects({
      indexName: this.postsIndexName,
      objects: docs.map(doc => ({ objectID: doc.id, user_id: doc.user_id, body: doc.body, created_at: doc.created_at })),
    })
  }

  async deletePosts(ids: PostId[]): Promise<void> {
    await this.client.deleteObjects({ indexName: this.postsIndexName, objectIDs: ids })
  }

  /** プライマリとレプリカのインデックス設定を反映する（algolia-index パッケージから実行する） */
  async setIndexSettings(): Promise<unknown[]> {
    const usersReplicas = this.usersIndexSorts.map(sort => ({ name: replicaIndexName(`${this.indexPrefix}users`, sort), sort }))
    const postsReplicas = this.postsIndexSorts.map(sort => ({ name: replicaIndexName(`${this.indexPrefix}posts`, sort), sort }))
    const primary = await Promise.all([
      this.client.setSettings({
        indexName: this.usersIndexName,
        indexSettings: {
          searchableAttributes: ["display_name"],
          replicas: usersReplicas.map(x => x.name),
        },
      }),
      this.client.setSettings({
        indexName: this.postsIndexName,
        indexSettings: {
          searchableAttributes: ["body"],
          attributesForFaceting: ["filterOnly(user_id)"],
          replicas: postsReplicas.map(x => x.name),
        },
      }),
    ])
    const replicas = await Promise.all([...usersReplicas, ...postsReplicas].map(x =>
      this.client.setSettings({
        indexName: x.name,
        indexSettings: { customRanking: x.sort.map(s => `${s.direction}(${s.column})`) },
      }),
    ))
    return [...primary, ...replicas]
  }

}

export class FakeAlgoliaAccess implements AlgoliaAccessLike {

  async saveUsers(docs: UserDocument[]): Promise<void> {
    logger.debug("FakeAlgoliaAccess.saveUsers", { count: docs.length })
  }

  async deleteUsers(ids: UserId[]): Promise<void> {
    logger.debug("FakeAlgoliaAccess.deleteUsers", { count: ids.length })
  }

  async savePosts(docs: PostDocument[]): Promise<void> {
    logger.debug("FakeAlgoliaAccess.savePosts", { count: docs.length })
  }

  async deletePosts(ids: PostId[]): Promise<void> {
    logger.debug("FakeAlgoliaAccess.deletePosts", { count: ids.length })
  }

  async setIndexSettings(): Promise<unknown[]> {
    logger.info("FakeAlgoliaAccess.setIndexSettings")
    return []
  }

}
