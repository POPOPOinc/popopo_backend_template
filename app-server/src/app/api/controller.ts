import express from "express"
import { DecodedIdToken } from "firebase-admin/auth"
import { logger, updateContextWithUser } from "lib-server"
import { AdminDocument, AdminId, AdminPermission, AdminPermissionType, MaintenanceDocuments, UserDocument, UserId } from "schema"
import { ErrorKind, Errors } from "schema/api/error"
import { config } from "../../config"
import { Core } from "../../core"
import type { FirebaseRequestContext, ManageRequestContext, ServiceRequestContext } from "../../interfaces/request-context"
import { ErrorResponse, ErrorResponseValue, Response, Responses, SuccessOKResponse, SuccessResponse } from "../../interfaces/response"

export type Req = express.Request
export type Res<T> = express.Response<T>

// 各サービスで manage と service を共通的な引数で受け取りつつ、区別して扱うための型。
export type ManageOrServiceUser =
  | {
  kind: "manage"
  value: AdminDocument
}
  | {
  kind: "service"
  value: UserDocument
}

function sendResponse<T>(res: express.Response): (response: Response<T | ErrorResponseValue>) => void {
  return (response) => {
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
    res.setHeader("Access-Control-Allow-Headers", "Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date")
    return res.status(response.status).json(response.value)
  }
}

export function handle(handler: (req: Req) => Promise<SuccessResponse<unknown> | ErrorResponse>): (req: Req, res: Res<unknown>) => void {
  return async (req, res) => {
    let response: SuccessResponse<unknown> | ErrorResponse

    // デバッグ用: __error-code クエリパラメータで任意のエラーレスポンスをシミュレートする（本番環境では無効）
    const simulatedError = simulateErrorResponse(req)
    if (simulatedError !== null) {
      sendResponse(res)(simulatedError)
      return
    }

    if (req.headers.origin !== undefined
      && !config.web.allowedOrigins.includes(req.headers.origin)) {
      response = Responses.errorForbidden(`Unknown origin: ${req.headers.origin}`)
    } else {
      try {
        response = await handler(req)
      } catch (cause) {
        logger.error("ハンドリングされていない例外が発生しました", cause, undefined, { path: req.path, method: req.method })
        response = Responses.errorInternalServerError("システムエラーが発生しました。", cause)
      }
    }
    if (400 <= response.status && config.env === "prod") {
      (response.value as ErrorResponseValue).debug = undefined
    }
    sendResponse(res)(response)
  }
}

/**
 * Firebaseでログインさえしていれば利用できるハンドラ
 * (会員登録している/していないに関わらず利用できる)
 */
export function requireFirebaseLoginHandler<T>(
  type: "service" | "manage",
  handler: (req: Req, args: FirebaseRequestContext) => Promise<SuccessOKResponse<T> | ErrorResponse>,
): (req: Req, res: Res<unknown>) => void {
  return handle(async (req) => {
    const args = await loginFirebase(req, type)
    if (args.kind === "error") {
      return args.value
    }
    if (args.kind === "no-login") {
      return Responses.errorUnauthorized("ログインしていません。")
    }
    // service の場合のみメンテナンスチェック（manage は影響を受けない）
    if (type === "service") {
      const maintenanceError = await checkMaintenance(args.value.firebase.uid)
      if (maintenanceError !== null) {
        return maintenanceError
      }
    }
    return await handler(req, args.value)
  })
}

/**
 * Firebaseにログインしており、かつそのユーザーがサービスに会員登録されていれば利用できるハンドラ
 */
export function requireServiceLoginHandler<T>(handler: (req: Req, args: ServiceRequestContext & { login: ManageOrServiceUser }) => Promise<SuccessResponse<T> | ErrorResponse>): (req: Req, res: Res<unknown>) => void {
  return handle(async (req) => {
    const firebaseSession = await loginFirebase(req, "service")
    if (firebaseSession.kind === "error") {
      return firebaseSession.value
    }
    if (firebaseSession.kind === "no-login") {
      return Responses.errorUnauthorized("ログインしていません。")
    }
    const maintenanceError = await checkMaintenance(firebaseSession.value.firebase.uid)
    if (maintenanceError !== null) {
      return maintenanceError
    }

    const args = await loginService(req, firebaseSession.value)
    if (args.kind === "error") {
      return args.value
    }

    return await handler(req, args.value)
  })
}

/**
 * Firebaseにログインしており、かつそのユーザーが管理者として登録されていれば利用できるハンドラ
 */
function requireManageLoginHandler<T>(handler: (req: Req, args: ManageRequestContext & { login: ManageOrServiceUser }) => Promise<SuccessOKResponse<T> | ErrorResponse>): (req: Req, res: Res<unknown>) => void {
  return handle(async (req) => {
    const firebaseSession = await loginFirebase(req, "manage")
    if (firebaseSession.kind === "error") {
      return firebaseSession.value
    }
    if (firebaseSession.kind === "no-login") {
      return Responses.errorUnauthorized("ログインしていません。")
    }

    const args = await loginManage(req, firebaseSession.value)
    if (args.kind === "error") {
      return args.value
    }

    return await handler(req, args.value)
  })
}

/**
 * ユーザーが管理者であり、かつ指定された権限を持っている場合のみ利用できるハンドラ
 *
 * @param requirePermissionType 必要な権限 (全て持っている必要がある)
 */
export function requireManageSpecificPermissionHandler<T>(
  requirePermissionType: AdminPermissionType | AdminPermissionType[],
  handler: (req: Req, args: ManageRequestContext & { login: ManageOrServiceUser }) => Promise<SuccessOKResponse<T> | ErrorResponse>,
): (req: Req, res: Res<unknown>) => void {
  const actualRequirePermissionType = typeof requirePermissionType === "string" ? [requirePermissionType] : requirePermissionType
  return requireManageLoginHandler(async (req, args) => {
    if (!isSufficientPermission(actualRequirePermissionType, args.admin.permission)) {
      return Responses.errorForbidden(`権限が不足しています。必要な権限: ${actualRequirePermissionType.join(", ")}`)
    }
    return await handler(req, args)
  })
}

function isSufficientPermission(requirePermissionType: AdminPermissionType[], userPermissionConfigure?: AdminPermission): boolean {
  return (
    userPermissionConfigure?.kind === "all" ||
    userPermissionConfigure?.kind === "some" && requirePermissionType.every((permission) => {
      return userPermissionConfigure.values.includes(permission)
    })
  )
}

async function loginFirebase(
  req: Req,
  type: "service" | "manage",
): Promise<{ kind: "error"; value: ErrorResponse } | { kind: "firebase"; value: FirebaseRequestContext } | { kind: "no-login"; value: null }> {
  let idToken = req.headers["authorization"]
  if (idToken === undefined) {
    return { kind: "no-login", value: null }
  }
  if (!idToken.startsWith("Bearer ")) {
    return { kind: "error", value: Responses.errorUnauthorized("ID Token を指定する形式が不正です。") }
  }
  idToken = idToken.replace(/^Bearer /, "")

  let firebase: DecodedIdToken
  try {
    switch (type) {
      case "service":
        firebase = await Core.firebaseAuth.verifyIdToken(idToken)
        break
      case "manage":
        firebase = await Core.fireAuthManageTenant.verifyIdToken(idToken)
        break
      default:
        return type satisfies never
    }
  } catch (cause) {
    logger.info("ID Token の検証に失敗しました", { cause: String(cause) })
    return { kind: "error", value: Responses.errorUnauthorized("ID Token が不正です。", cause) }
  }

  return { kind: "firebase", value: { type, idToken, firebase } }
}

async function loginService(req: Req, firebaseSession: FirebaseRequestContext): Promise<{ kind: "error"; value: ErrorResponse } | { kind: "service"; value: ServiceRequestContext & { login: ManageOrServiceUser } }> {
  const user = await Core.userUseCase.getUser(UserId(firebaseSession.firebase.uid))
  if (user === null) {
    return { kind: "error", value: Responses.errorUnauthorized("アカウントが登録されていません。") }
  }

  // BAN されたユーザーのアクセスを拒否する
  // Firebase Auth の disabled フラグだけでは既存の ID Token が最大1時間有効なままになるため、
  // ここで Firestore 上のステータスを確認して即座にブロックする
  if (user.status === "banned") {
    return { kind: "error", value: Responses.errorForbidden("このアカウントは利用停止されています。", { userId: user.id, status: user.status }) }
  }

  updateContextWithUser(req, "service", user.id, user)

  return { kind: "service", value: { user, login: { kind: "service", value: user } } }
}

async function loginManage(req: Req, firebaseSession: FirebaseRequestContext): Promise<{ kind: "error"; value: ErrorResponse } | { kind: "manage"; value: ManageRequestContext & { login: ManageOrServiceUser } }> {
  const admin = await Core.adminUseCase.get(AdminId(firebaseSession.firebase.uid))
  if (admin === null) {
    return { kind: "error", value: Responses.errorUnauthorized("管理者が登録されていません。") }
  }

  updateContextWithUser(req, "manage", admin.id, admin)

  return { kind: "manage", value: { admin, login: { kind: "manage", value: admin }, firebase: firebaseSession.firebase } }
}

/**
 * デバッグ用: __error-code クエリパラメータで任意のエラーレスポンスをシミュレートする。
 * クライアントで特定の API が特定のエラーを返した場合の挙動をデバッグするために使用する。
 * 本番環境では常に null を返し、何も起きない。
 *
 * 使い方:
 *   ?__error-code=NOT_FOUND  → 定義済みのエラー種別に対応する HTTP ステータスで返す
 *   ?__error-code=custom     → 未定義の種別は 500 で返す
 */
function simulateErrorResponse(req: Req): ErrorResponse | null {
  if (config.env === "prod") {
    return null
  }
  const errorCode = req.query["__error-code"]
  if (typeof errorCode !== "string") {
    return null
  }

  const knownError = errorCode in Errors ? Errors[errorCode as ErrorKind] : undefined
  const status = knownError?.status ?? 500

  logger.debug("デバッグ用エラーレスポンスをシミュレートします", { errorCode, status, path: req.path })

  return {
    status,
    value: {
      kind: errorCode as ErrorKind,
      message: `[デバッグ] シミュレートされたエラーレスポンス (code=${errorCode}, status=${status})`,
    },
  }
}

/**
 * メンテナンス状態を確認する（/app-configs/maintenance）。
 * @returns アクセス拒否の場合は ErrorResponse、許可の場合は null
 */
async function checkMaintenance(firebaseUid: string): Promise<ErrorResponse | null> {
  try {
    const maintenanceDoc = await Core.firestoreAccess.maintenance.getMaintenanceDocWithoutTransaction()

    // メンテナンス中のスケジュールを1つ探す（重複を許容しないため1つだけ見つければ十分）
    const activeSchedule = maintenanceDoc.schedules.find(schedule =>
      MaintenanceDocuments.isUnderMaintenance(schedule)
    )

    if (!activeSchedule) {
      return null
    }

    // stage が maintenance の場合は全ユーザーをブロック
    if (activeSchedule.stage === "maintenance") {
      return Responses.errorUnderMaintenance(
        "現在メンテナンス中です。しばらくお待ちください。",
        { stage: "maintenance" }
      )
    }

    // stage が internal-check の場合は internal_users に含まれるユーザーのみ許可
    if (activeSchedule.stage === "internal-check" && !MaintenanceDocuments.isInternalUser(maintenanceDoc, firebaseUid)) {
      return Responses.errorUnderMaintenance(
        "現在メンテナンス中です。しばらくお待ちください。",
        { stage: "internal-check" }
      )
    }

    return null
  } catch (e) {
    // メンテナンスドキュメントの取得に失敗した場合はフェイルオープン（アクセス許可）
    // 全ユーザーの全リクエストが通る経路のため、大量のアラートを防ぐために warn レベルで記録
    logger.warn("メンテナンスステータスの確認に失敗しました", { error: String(e) })
    return null
  }
}
