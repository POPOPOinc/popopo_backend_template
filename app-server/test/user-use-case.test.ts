import { describe, expect, jest, test } from "@jest/globals"
import type { AlgoliaAccessLike } from "lib-server/algolia-access"
import { TaskKind, UserId } from "schema"
import { UserUseCase } from "../src/usecase/user-use-case"
import { createMockFirestoreAccess, fakeTransaction } from "./helpers/mock-firestore-access"

const algolia: jest.Mocked<AlgoliaAccessLike> = {
  saveUsers: jest.fn<AlgoliaAccessLike["saveUsers"]>(),
  deleteUsers: jest.fn<AlgoliaAccessLike["deleteUsers"]>(),
  savePosts: jest.fn<AlgoliaAccessLike["savePosts"]>(),
  deletePosts: jest.fn<AlgoliaAccessLike["deletePosts"]>(),
  setIndexSettings: jest.fn<AlgoliaAccessLike["setIndexSettings"]>(),
}

describe("UserUseCase", () => {
  test("registerUser はユーザーを作り、Algolia 同期のタスクを積む", async () => {
    const { mock, firestoreAccess } = createMockFirestoreAccess()
    const useCase = new UserUseCase(firestoreAccess, algolia)
    const userId = UserId("user-1")

    const result = await useCase.registerUser(userId, { display_name: "alice" }, 1000)

    expect(result.status).toBe(200)
    expect(mock.user.createUser).toHaveBeenCalledWith(fakeTransaction, {
      id: userId,
      display_name: "alice",
      status: "active",
      created_at: 1000,
      updated_at: 1000,
    })
    expect(mock.task.createTask).toHaveBeenCalledWith(fakeTransaction, { kind: TaskKind.syncUserToAlgolia, value: userId }, new Date(1000))
  })

  test("registerUser は登録済みなら 409 を返し、何も書かない", async () => {
    const { mock, firestoreAccess } = createMockFirestoreAccess()
    mock.user.getUserById.mockResolvedValueOnce({ id: UserId("user-1") })
    const useCase = new UserUseCase(firestoreAccess, algolia)

    const result = await useCase.registerUser(UserId("user-1"), { display_name: "alice" }, 1000)

    expect(result.status).toBe(409)
    expect(mock.user.createUser).not.toHaveBeenCalled()
    expect(mock.task.createTask).not.toHaveBeenCalled()
  })
})
