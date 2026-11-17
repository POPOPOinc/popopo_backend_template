import { z } from "zod/v4"
import { zPeriod } from "../api/app/zod.gen"

/**
 * 汎用的な期間を表す型（yml の components.yml の Period から生成した Zod）
 */
export const Period = zPeriod

export type Period = z.infer<typeof Period>

/**
 * 期間の状態を表す型
 * システムが自動計算・管理する
 */
export const PeriodState = z.object({
  active: z.boolean().describe("現在期間内かどうか"),
  next_change_at: z.number().nullable().describe("次の期間状態変更時刻（開始・終了）"),
})

export type PeriodState = z.infer<typeof PeriodState>

/**
 * 期間の状態を計算する汎用関数
 */
export function calculatePeriodState(
  period: Period,
  now: number
): PeriodState {
  const active = period.start_at <= now &&
    (period.end_at === null || now < period.end_at)

  const next_change_at =
    now < period.start_at ? period.start_at :
    period.end_at && now < period.end_at ? period.end_at :
    null

  return { active, next_change_at }
}

/** yml の maxLength を、コードから定数として参照する */
export function maxLengthOf(schema: z.ZodString): number {
  if (schema.maxLength === null) {
    throw new Error("yml に maxLength が書かれていません")
  }
  return schema.maxLength
}
