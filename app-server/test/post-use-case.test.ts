import { beforeEach, describe, expect, jest, test } from "@jest/globals"
import type { AlgoliaAccessLike } from "lib-server/algolia-access"
import { PostDocument, PostId, TaskKind, UserDocument, UserId } from "schema"
import type { FirebaseStorageAccess } from "../src/access/firebase-storage-access"
import { PostUseCase } from "../src/usecase/post-use-case"
import { createMockFirestoreAccess, fakeTransaction } from "./helpers/mock-firestore-access"

const algolia: jest.Mocked<AlgoliaAccessLike> = {
  saveUsers: jest.fn<AlgoliaAccessLike["saveUsers"]>(),
  deleteUsers: jest.fn<AlgoliaAccessLike["deleteUsers"]>(),
  savePosts: jest.fn<AlgoliaAccessLike["savePosts"]>(),
  deletePosts: jest.fn<AlgoliaAccessLike["deletePosts"]>(),
  setIndexSettings: jest.fn<AlgoliaAccessLike["setIndexSettings"]>(),
}
const storage = { deletePostMedia: jest.fn<FirebaseStorageAccess["deletePostMedia"]>() }
const storageAccess = storage as unknown as FirebaseStorageAccess

const user: UserDocument = { id: UserId("user-1"), display_name: "alice", status: "active", created_at: 0, updated_at: 0 }
const postId = PostId("post-1")
const post: PostDocument = {
  id: postId,
  user_id: user.id,
  author: { id: user.id, display_name: user.display_name },
  body: "hello",
  display_period: { start_at: 0, end_at: null },
  display_period_state: { active: true, next_change_at: null },
  created_at: 0,
  updated_at: 0,
}

// Algolia は transaction のあとに直接呼ばず、同じ transaction で積んだタスクを daemon が処理する（失敗しても再試行できる）
describe("PostUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("createPost は投稿と同じ transaction で Algolia 同期のタスクを積み、Algolia を直接呼ばない", async () => {
    const { mock, firestoreAccess } = createMockFirestoreAccess()
    mock.post.newPostId.mockReturnValue(postId)
    const useCase = new PostUseCase(firestoreAccess, algolia, storageAccess)

    const result = await useCase.createPost(user, { body: "hello" }, 1000)

    expect(result.status).toBe(200)
    expect(mock.task.createTask).toHaveBeenCalledWith(fakeTransaction, { kind: TaskKind.syncPostToAlgolia, value: postId }, new Date(1000))
    expect(algolia.savePosts).not.toHaveBeenCalled()
  })

  test("deleteOwnPost は削除と同じ transaction で Algolia 同期のタスクを積む", async () => {
    const { mock, firestoreAccess } = createMockFirestoreAccess()
    mock.post.getPostById.mockResolvedValueOnce(post)
    const useCase = new PostUseCase(firestoreAccess, algolia, storageAccess)

    const result = await useCase.deleteOwnPost(user, postId)

    expect(result.status).toBe(200)
    expect(mock.task.createTask).toHaveBeenCalledWith(fakeTransaction, { kind: TaskKind.syncPostToAlgolia, value: postId }, expect.any(Date))
    expect(algolia.deletePosts).not.toHaveBeenCalled()
    expect(storage.deletePostMedia).toHaveBeenCalledWith(postId)
  })

  test("syncPostToAlgolia は最新の投稿が表示期間内なら保存し、期間外か削除済みなら消す", async () => {
    const { mock, firestoreAccess } = createMockFirestoreAccess()
    const useCase = new PostUseCase(firestoreAccess, algolia, storageAccess)

    mock.post.getPostById.mockResolvedValueOnce(post)
    await useCase.syncPostToAlgolia(postId)
    expect(algolia.savePosts).toHaveBeenCalledWith([post])

    mock.post.getPostById.mockResolvedValueOnce({ ...post, display_period_state: { active: false, next_change_at: null } })
    await useCase.syncPostToAlgolia(postId)
    mock.post.getPostById.mockResolvedValueOnce(null)
    await useCase.syncPostToAlgolia(postId)
    expect(algolia.deletePosts).toHaveBeenCalledTimes(2)
    expect(algolia.deletePosts).toHaveBeenCalledWith([postId])
  })
})
