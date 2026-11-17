import { describe, expect, jest, test } from "@jest/globals"
import { TaskDocument, TaskId, TaskKind, UserId } from "schema"
import type { FirestoreAccess } from "../src/access/firestore-access"
import { TaskConsumer, TaskProcessResult } from "../src/app/daemon/lib/TaskConsumer"
import { WaitAndProcessRunner } from "../src/app/daemon/lib/WaitAndProcessRunner"
import { fakeTransaction } from "./helpers/mock-firestore-access"

// SIGTERM のあと Cloud Run は 10 秒で SIGKILL するので、一度に取ってきた残りのアイテムは処理せずに抜ける
describe("daemon は SIGTERM のあと残りのアイテムを処理しない", () => {
  test("WaitAndProcessRunner", async () => {
    const abortController = new AbortController()
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }]
    const process = jest.fn(async () => {
      abortController.abort("SIGTERM")
    })
    const runner = new WaitAndProcessRunner({ name: "test", wait: async () => items, process })

    await runner.run({ abortSignal: abortController.signal })

    expect(process).toHaveBeenCalledTimes(1)
  })

  test("TaskConsumer", async () => {
    const abortController = new AbortController()
    const tasks: TaskDocument<typeof TaskKind.syncUserToAlgolia>[] = ["a", "b", "c"].map(id => ({
      id: TaskId(id),
      kind: TaskKind.syncUserToAlgolia,
      value: UserId(id),
      task_failure_count: 0,
      visible_start_at: 0,
      created_at: 0,
      updated_at: 0,
    }))
    const mock = {
      runTransaction: jest.fn(async <T>(fn: (tx: FirebaseFirestore.Transaction) => Promise<T>) => fn(fakeTransaction)),
      task: {
        waitTask: jest.fn(async () => tasks),
        tryAcquireLockAndGetLatest: jest.fn(async ({ taskId }: { taskId: TaskId }) => ({ success: true, task: tasks.find(t => t.id === taskId) })),
        deleteTask: jest.fn(),
        markTaskFailed: jest.fn(),
      },
    }
    const process = jest.fn(async () => {
      abortController.abort("SIGTERM")
      return TaskProcessResult.Ok
    })
    const consumer = new TaskConsumer({
      firestoreAccess: mock as unknown as FirestoreAccess,
      kinds: TaskKind.syncUserToAlgolia,
      process,
    })

    await consumer.run({ abortSignal: abortController.signal })

    expect(process).toHaveBeenCalledTimes(1)
    expect(mock.task.tryAcquireLockAndGetLatest).toHaveBeenCalledTimes(1)
    expect(mock.task.deleteTask).toHaveBeenCalledTimes(1)
  })
})
