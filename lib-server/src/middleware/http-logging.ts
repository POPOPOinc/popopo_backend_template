import type { Request, Response, NextFunction } from "express"
import { logger } from "../logger/log"

export interface HttpLoggingOptions {
  /** リクエストログを除外するパスの一覧（完全一致）。デフォルト: ["/"] */
  excludePaths?: string[]
  /** リクエストログを除外するパスプレフィックスの一覧。デフォルト: [] */
  excludePathPrefixes?: string[]
}

/**
 * HTTP リクエストの処理時間を計測し、完了時にログ出力する Express ミドルウェア。
 * 全サービス共通で使用する。
 */
export function createHttpLoggingMiddleware(options?: HttpLoggingOptions) {
  const excludePaths = new Set(options?.excludePaths ?? ["/"])
  const excludePathPrefixes = options?.excludePathPrefixes ?? []

  return (req: Request, res: Response, next: NextFunction) => {
    if (excludePaths.has(req.path) || excludePathPrefixes.some((p) => req.path.startsWith(p))) {
      next()
      return
    }

    const startMs = Date.now()

    res.on("finish", () => {
      const elapsedMs = Date.now() - startMs
      const { statusCode } = res
      const severity = statusCode < 400 ? "INFO" : statusCode < 500 ? "WARN" : "ERROR"
      logger.log(
        severity,
        "HTTPリクエストが完了しました",
        { method: req.method, path: req.path, statusCode, elapsedMs },
        undefined,
        { ignoreSlackReport: true },
      )
    })

    next()
  }
}
