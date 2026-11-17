import { z } from "zod/v4"

/**
 * API におけるエラーの定義。キー（UPPER_SNAKE）がレスポンスの kind になる。
 * これを元に document の「API Error」ページが自動生成される（document/src/api-error.tsx）。
 */
export const Errors = {
  BAD_REQUEST: {
    status: 400,
    details: z.object({
      issues: z.array(z.object({
        code: z.string(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
        message: z.string(),
      })),
    }).optional(),
  },
  UNAUTHORIZED: {
    status: 401,
  },
  FORBIDDEN: {
    status: 403,
  },
  NOT_FOUND: {
    status: 404,
  },
  CONFLICT: {
    status: 409,
  },
  SYSTEM_ERROR: {
    status: 500,
  },
  /** メンテナンス中（app-configs/maintenance） */
  UNDER_MAINTENANCE: {
    status: 503,
    details: z.object({
      stage: z.enum(["maintenance", "internal-check"]).describe("メンテナンスの段階"),
    }),
  },
} as const satisfies Record<string, { status: number, details?: z.ZodType }>

export type ErrorKind = keyof typeof Errors

/** app-server から参照するための別名 */
export const ErrorKind = {
  BadRequest: "BAD_REQUEST",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  Conflict: "CONFLICT",
  InternalServerError: "SYSTEM_ERROR",
  UnderMaintenance: "UNDER_MAINTENANCE",
} as const satisfies Record<string, ErrorKind>
