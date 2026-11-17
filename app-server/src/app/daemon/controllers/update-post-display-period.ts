import { Core } from "../../../core"
import { defineWaitAndProcessDaemon } from "../define-daemon-helpers"

/**
 * Post の表示期間状態をリアルタイムで自動更新するデーモン
 * display_period_state.next_change_at の時刻を監視し、時刻に達したら状態を更新する
 */
export const updatePostDisplayPeriod = defineWaitAndProcessDaemon({
  name: "updatePostDisplayPeriod",
  wait: (abortSignal) => Core.firestoreAccess.post.waitPostDisplayPeriodChange(abortSignal),
  process: async (post) => {
    await Core.postUseCase.updateDisplayPeriodStatus(post)
  },
})
