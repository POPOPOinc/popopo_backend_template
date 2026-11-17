import { TaskKind } from "schema"
import { Core } from "../../../core"
import { defineTaskConsumerDaemon } from "../define-daemon-helpers"
import { TaskProcessResult } from "../lib/TaskConsumer"

/** 投稿の作成・表示期間の変更・削除のときに積まれたタスクを処理し、Algolia のインデックスを同期する（スケールする daemon） */
export const consumeSyncPostToAlgoliaTask = defineTaskConsumerDaemon({
  name: "consume-sync-post-to-algolia-task",
  kinds: [TaskKind.syncPostToAlgolia],
  process: async task => {
    await Core.postUseCase.syncPostToAlgolia(task.value)
    return TaskProcessResult.Ok
  },
})
