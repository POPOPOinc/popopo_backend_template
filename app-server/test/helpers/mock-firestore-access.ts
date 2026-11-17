import { jest } from "@jest/globals"
import type { FirestoreAccess } from "../../src/access/firestore-access"

/** トランザクションの中身を即時に実行するための偽の transaction。Access をモックするので中身は使われない */
export const fakeTransaction = {} as FirebaseFirestore.Transaction

/**
 * UseCase / Service の単体テスト用の FirestoreAccess。
 * runTransaction は fakeTransaction で即時実行し、各 Access のメソッドは jest.fn() に置き換える。
 */
export function createMockFirestoreAccess() {
  const mock = {
    runTransaction: jest.fn(async <T>(fn: (tx: FirebaseFirestore.Transaction) => Promise<T>) => fn(fakeTransaction)),
    user: {
      getUserById: jest.fn(async (): Promise<unknown> => null),
      createUser: jest.fn(),
      updateDisplayName: jest.fn(),
      updateStatus: jest.fn(),
    },
    post: {
      newPostId: jest.fn(),
      getPostById: jest.fn(async (): Promise<unknown> => null),
      createPost: jest.fn(),
      updateDisplayPeriodStatus: jest.fn(),
      updateDisplayPeriod: jest.fn(),
      deletePost: jest.fn(),
    },
    adminOperation: {
      createAdminOperation: jest.fn(),
    },
    task: {
      createTask: jest.fn(),
    },
  }
  return { mock, firestoreAccess: mock as unknown as FirestoreAccess }
}
