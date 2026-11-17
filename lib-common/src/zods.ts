import { z } from "zod/v4"
import { convertDateTimeLocalToEpochMillis } from "./time"

export const zOptionalTextInput = z.string().pipe(z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()))

/**
 * 空文字を許容しないテキストボックスに使う想定
 */
export const zNonEmptyTextInput = z.string().min(1, "必須要素です")

// 日時範囲の共通スキーマ定義
export const zDateTimeRangeInput = z.object({
  start_at: zNonEmptyTextInput.transform((val) => convertDateTimeLocalToEpochMillis(val)),
  end_at: zOptionalTextInput.transform((val) => (val == null || val === "") ? null : convertDateTimeLocalToEpochMillis(val)),
  unlimited: z.boolean(),
}).check((ctx) => {
  const { unlimited, end_at, start_at } = ctx.value
  if (!unlimited && end_at === null) {
    ctx.issues.push({
      input: end_at,
      code: "custom",
      path: ["end_at"],
      message: "終了日時を入力してください",
    })
  }
  if (!unlimited && end_at != null && end_at < start_at) {
    ctx.issues.push({
      path: ["end_at"],
      input: end_at,
      code: "custom",
      message: "終了日時は開始日時より後に設定してください",
    })
  }
})
