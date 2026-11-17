import { TaskKind } from "schema"
import { DaemonDefinition } from "./interface"
import { TaskConsumer, TaskConsumerOptions } from "./lib/TaskConsumer"
import { WaitAndProcessRunner, WaitAndProcessRunnerOptions } from "./lib/WaitAndProcessRunner"
import { Core } from "../../core"

/**
 * TaskConsumer ベースの DaemonDefinition を定義するヘルパー。
 * firestoreAccess は Core.firestoreAccess を自動的に使用する。
 *
 * 使用例:
 * ```typescript
 * export const consumeSyncUserToAlgoliaTask = defineTaskConsumerDaemon({
 *   name: "consume-sync-user-to-algolia-task",
 *   kinds: TaskKind.syncUserToAlgolia,
 *   process: async task => {
 *     await Core.userUseCase.syncUserToAlgolia(task.value)
 *     return TaskProcessResult.Ok
 *   }
 * })
 * ```
 */
export function defineTaskConsumerDaemon<Kind extends TaskKind>(
  options: Omit<TaskConsumerOptions<Kind>, "firestoreAccess"> & { name: string }
): DaemonDefinition {
  const { name: _name, ...taskConsumerOptions } = options
  return {
    handler: async (_args, ctx) => {
      const consumer = new TaskConsumer({
        firestoreAccess: Core.firestoreAccess,
        ...taskConsumerOptions,
      })
      await consumer.run({ abortSignal: ctx.abortSignal })
    }
  }
}

/**
 * WaitAndProcessRunner ベースの DaemonDefinition を定義するヘルパー。
 */
export function defineWaitAndProcessDaemon<T extends { id: string }>(
  options: WaitAndProcessRunnerOptions<T>
): DaemonDefinition {
  return {
    handler: async (_args, ctx) => {
      const runner = new WaitAndProcessRunner(options)
      await runner.run({ abortSignal: ctx.abortSignal })
    }
  }
}
