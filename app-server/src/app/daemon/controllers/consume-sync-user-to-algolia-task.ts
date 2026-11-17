import { TaskKind } from "schema"
import { Core } from "../../../core"
import { defineTaskConsumerDaemon } from "../define-daemon-helpers"
import { TaskProcessResult } from "../lib/TaskConsumer"

/** ユーザーの更新時に積まれたタスクを処理し、Algolia のインデックスを同期する（スケールする daemon） */
export const consumeSyncUserToAlgoliaTask = defineTaskConsumerDaemon({
  name: "consume-sync-user-to-algolia-task",
  kinds: [TaskKind.syncUserToAlgolia, TaskKind.deleteUser],
  process: async task => {
    await Core.userUseCase.syncUserToAlgolia(task.value)
    return TaskProcessResult.Ok
  },
})
