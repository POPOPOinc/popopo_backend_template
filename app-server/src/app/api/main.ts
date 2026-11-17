import cors from "cors"
import express from "express"
import helmet from "helmet"
import { createHttpLoggingMiddleware, createRequestContextMiddleware, logger } from "lib-server"
import { config } from "../../config"
import { Core } from "../../core"
import { Env } from "../../env"
import { Responses } from "../../interfaces/response"
import { handle } from "./controller"
import { debugApp } from "./controllers/debug-controller"
import { managePostApp } from "./controllers/manage/manage-post-controller"
import { manageUserApp } from "./controllers/manage/manage-user-controller"
import { postApp } from "./controllers/post-controller"
import { privateAuth } from "./controllers/private"
import { privatePing } from "./controllers/private/ping-controller"
import { statsApp } from "./controllers/stats-controller"
import { userApp } from "./controllers/user-controller"
import { onHTTPResponse } from "./metric"

/**
 * CORS ヘッダーをレスポンスに設定する。
 * sendResponse() と同じヘッダーを設定する。エラーハンドラーやタイムアウトミドルウェアなど、
 * sendResponse() を経由しないレスポンスでも CORS ヘッダーを付与するために使用する。
 */
function setCorsHeaders(res: express.Response): void {
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader("Access-Control-Allow-Headers", "Authorization, X-ID-Token, X-Firebase-AppCheck, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date")
}

/**
 * リクエストタイムアウトミドルウェア。
 * 基盤側（Cloud Functions / Load Balancer）のタイムアウトより先に、CORS ヘッダー付きのエラーレスポンスを返す。
 * これにより、ブラウザで CORS エラーとして見えてしまうことを防ぐ。
 *
 * デバッグ用: __request-timeout-ms クエリパラメータでタイムアウト値を上書きできる（本番環境では無効）。
 */
const REQUEST_TIMEOUT_MS = 28000
const requestTimeoutMiddleware: express.RequestHandler = (req, res, next) => {
  let timeoutMs = REQUEST_TIMEOUT_MS
  if (config.env !== "prod") {
    const override = req.query["__request-timeout-ms"]
    if (typeof override === "string") {
      const ms = parseInt(override, 10)
      if (!isNaN(ms) && 0 < ms) {
        timeoutMs = ms
      }
    }
  }
  const isDebugTimeout = timeoutMs !== REQUEST_TIMEOUT_MS
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      logger.error("リクエストタイムアウト", undefined, undefined, { path: req.path, method: req.method, timeoutMs }, isDebugTimeout ? "WARN" : "ERROR")
      setCorsHeaders(res)
      res.status(504).json({
        kind: "TIMEOUT",
        message: "リクエストがタイムアウトしました。",
      })
    }
  }, timeoutMs)
  res.on("finish", () => clearTimeout(timer))
  res.on("close", () => clearTimeout(timer))
  next()
}

const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof URIError) {
    logger.error("URIエラー", err, undefined, undefined, "WARN")
    setCorsHeaders(res)
    res.status(400).send("Bad Request")
    return
  }
  // body-parser の JSON パースエラー。クライアントからの不正なリクエストのため warn レベルで記録する
  if ("type" in err && err.type === "entity.parse.failed") {
    logger.error("JSONパースエラー", err, undefined, undefined, "WARN")
    setCorsHeaders(res)
    res.status(400).send("Bad Request")
    return
  }
  next(err)
}

/** Express アプリを組み立てる。ローカルでは listen し、Cloud Functions では onRequest で包む（src/functions.ts） */
export function createServer(): express.Express {
  const app = express.Router()
  app.use(userApp)
  app.use(postApp)
  if (config.env !== "prod") {
    app.use(debugApp)
  }

  const manage = express.Router()
  manage.use(manageUserApp)
  manage.use(managePostApp)

  const privateRouter = express.Router()
  privateRouter.use(privateAuth)
  privateRouter.use(privatePing)

  return express()
    .use(helmet())
    .use(createRequestContextMiddleware(config.firebase.projectId))
    .use(createHttpLoggingMiddleware({ excludePaths: ["/"], excludePathPrefixes: ["/stats/"] }))
    .use((req, res, next) => {
      if (req.path !== "/" && !req.path.startsWith("/stats/")) {
        res.on("finish", () => onHTTPResponse(req, res))
      }
      next()
    })
    .options("/{*splat}", cors())
    .use(express.json())
    .use(requestTimeoutMiddleware)
    .use("/api/v1", app)
    .use("/api/v1/manage", manage)
    .use("/api/v1/private", privateRouter)
    .use("/stats", statsApp)
    .get("/", (_req, res) => {
      res.send({})
    })
    .all("/{*splat}", handle(async () => Responses.errorNotFound("route not found.")))
    .use(errorHandler)
}

export default function (args: string[]) {
  logger.info("サーバーを起動しています...", { args: args.join(",") })

  process.on("unhandledRejection", cause => {
    logger.error("未処理の例外", cause)
  })

  Core.initialize()
  const server = createServer().listen(Env.port, Env.host, () => {
    // Load Balancer の keep-alive タイムアウト（600秒）より大きい値にして、502 を防ぐ
    server.keepAliveTimeout = 620 * 1000
    server.headersTimeout = 625 * 1000
    logger.debug("起動しました", {
      env: config.env,
      url: `http://${Env.host}:${Env.port}`,
    })
  })

  process.on("uncaughtException", (error) => {
    logger.error("キャッチされていない例外", error)
  })

  process.on("SIGTERM", () => {
    logger.info("サーバーのシャットダウンを開始します")
    server.close()
  })
}
