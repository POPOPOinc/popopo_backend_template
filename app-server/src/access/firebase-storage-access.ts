import { Storage } from "firebase-admin/storage"
import { FirebaseStoragePaths, PostId, UserId } from "schema"
import { config } from "../config"
import { ErrorResponse, Responses } from "../interfaces/response"

type MoveResult = { kind: "OK" } | { kind: "error", value: ErrorResponse }

/** Cloud Storage のアクセス。パスは schema の FirebaseStoragePaths で一元管理する */
export class FirebaseStorageAccess {

  constructor(private readonly storage: Storage) {
  }

  private bucket() {
    return this.storage.bucket(config.firebase.storageBucket)
  }

  /**
   * 指定 prefix 配下のファイルを一括削除する。
   * 既に存在しないファイル（404）は無視する。
   * deleteFiles は force: true でも 404 をまとめて throw するため、
   * 冪等な削除処理で使うにはこのラッパーが必要。
   */
  private async deleteFilesByPrefix(prefix: string): Promise<void> {
    try {
      await this.bucket().deleteFiles({ prefix, force: true })
    } catch (e: unknown) {
      // deleteFiles({ force: true }) は全ファイル処理後にエラー配列を throw する。
      // 404（ファイルが存在しない）は冪等な削除では想定内なので無視する。
      if (Array.isArray(e)) {
        const nonNotFoundErrors = e.filter((err: unknown) =>
          !(err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === 404)
        )
        if (0 < nonNotFoundErrors.length) {
          throw nonNotFoundErrors.length === 1 ? nonNotFoundErrors[0] : nonNotFoundErrors
        }
      } else {
        throw e
      }
    }
  }

  private getURL(
    path: string,
    queries: URLSearchParams = new URLSearchParams()
  ) {
    queries.set("alt", "media")
    const bucket = this.bucket()
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    // noinspection HttpUrlsUsage
    return (
      emulatorHost
        ? `http://${emulatorHost}`
        : `https://firebasestorage.googleapis.com`
    ) + `/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?${queries.toString()}`
  }

  private async moveFile(sourcePath: string, destPath: string): Promise<MoveResult> {
    const sourceFile = this.bucket().file(sourcePath)
    const [sourceExists] = await sourceFile.exists()

    if (!sourceExists) {
      return { kind: "error" as const, value: Responses.errorBadRequest(`ファイルが期待されるパスにアップロードされていません。path: ${sourcePath}`) }
    }

    await sourceFile.move(destPath)
    return { kind: "OK" as const }
  }

  // User icon

  /** 同じパスに上書きするため、`updated` クエリでキャッシュを無効化する */
  getUserIconURL(userId: UserId, now: Date) {
    return this.getURL(
      FirebaseStoragePaths.User.getIconPathValid(userId),
      new URLSearchParams({ "updated": now.getTime().toString() })
    )
  }

  async moveUserIconImageAsValid(firebaseUid: string, userId: UserId): Promise<MoveResult> {
    const sourcePath = FirebaseStoragePaths.User.getIconPathUploaded(firebaseUid)
    const destPath = FirebaseStoragePaths.User.getIconPathValid(userId)
    return await this.moveFile(sourcePath, destPath)
  }

  async deleteUserIconValid(userId: UserId): Promise<void> {
    await this.bucket()
      .file(FirebaseStoragePaths.User.getIconPathValid(userId))
      .delete({ ignoreNotFound: true })
  }

  // Post image

  getPostImageURL(postId: PostId, now: Date) {
    return this.getURL(
      FirebaseStoragePaths.Post.getImagePathValid(postId),
      new URLSearchParams({ "updated": now.getTime().toString() })
    )
  }

  async movePostImageAsValid(firebaseUid: string, postId: PostId): Promise<MoveResult> {
    const sourcePath = FirebaseStoragePaths.Post.getImagePathUploaded(firebaseUid)
    const destPath = FirebaseStoragePaths.Post.getImagePathValid(postId)
    return await this.moveFile(sourcePath, destPath)
  }

  async deletePostMedia(postId: PostId): Promise<void> {
    await this.deleteFilesByPrefix(FirebaseStoragePaths.Post.getPostPrefix(postId))
  }

}
