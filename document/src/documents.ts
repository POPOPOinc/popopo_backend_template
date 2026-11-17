import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi"
import { AdminDocumentBody, AdminOperationDocumentBody, AppConfigMaintenanceDocumentBody, FirestorePaths, MigrationDocumentBody, PostDocumentBody, TaskId, UserDocumentBody, UserId, UserPreferencesDocumentBody } from "schema"
import { z, ZodType } from "zod/v4"

export type DocumentSchema = {
  readonly type: ZodType<unknown>
  readonly path: string
  readonly note: string
}

/**
 * Firestore の全ドキュメントの一覧。
 * FirestorePaths に追加したパスがここに無いと lint（document/check-firestore-paths-coverage）が失敗する
 */
export const documents: ReadonlyArray<DocumentSchema> = [
  {
    type: UserDocumentBody,
    path: `/${FirestorePaths.Users.path}/{userId}`,
    note: "ユーザーを表現するドキュメントです。ドキュメント ID は Firebase Auth の uid です。",
  },
  {
    type: UserPreferencesDocumentBody,
    path: `/${FirestorePaths.Users.Preferences.getDocPath(UserId("{userId}"))}`,
    note: "ユーザー本人だけが読み書きする設定です。API を通さずクライアントから直接書き込みます（rules でフィールドと型を制限）。",
  },
  {
    type: PostDocumentBody,
    path: `/${FirestorePaths.Posts.path}/{postId}`,
    note: "ユーザーの投稿を表現するドキュメントです。表示用に投稿者の情報を author に非正規化して持ちます。",
  },
  {
    type: AdminDocumentBody,
    path: `/${FirestorePaths.Admins.path}/{adminId}`,
    note: "管理画面にログインできる管理者を表現するドキュメントです。ドキュメント ID は Firebase Auth の uid です。",
  },
  {
    type: MigrationDocumentBody,
    path: `/${FirestorePaths.Migrations.path}/{name}`,
    note: "migration パッケージで適用済みのマイグレーションを記録するドキュメントです。",
  },
  {
    type: AppConfigMaintenanceDocumentBody,
    path: `/${FirestorePaths.AppConfigs.path}/maintenance`,
    note: "メンテナンス管理ドキュメントです。app-server はログインが必要な API でこのドキュメントを確認し、メンテナンス中は 503 を返します。",
  },
  {
    type: AdminOperationDocumentBody,
    path: `/${FirestorePaths.AdminOperations.path}/{id}`,
    note: "管理者による操作の監査ログです。kind-value パターンで操作種別ごとに異なる value を持ち、target フィールドで操作対象（ユーザー・投稿）を特定できます。",
  },
  {
    type: z.unknown(),
    path: `/${FirestorePaths.Tasks.getDocPath(TaskId("{taskId}"))}`,
    note: "バックグラウンド処理のタスクを表します。daemon（TaskConsumer）が visible_start_at をロックとして使い、処理に成功すると削除します。",
  },
]

export function generateSchema(docs: DocumentSchema | readonly DocumentSchema[]) {
  const registry = new OpenAPIRegistry()
  const docArray: readonly DocumentSchema[] = Array.isArray(docs) ? docs : [docs]

  for (const document of docArray) {
    registry.registerPath({
      method: "get",
      description: document.note,
      path: document.path,
      summary: document.path,
      responses: {
        200: {
          content: {
            "application/json": { schema: document.type },
          },
          description: "",
        },
      },
    })
  }

  return new OpenApiGeneratorV3(registry.definitions)
    .generateDocument({
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "Firestore Documents",
      },
    })
}
