import { z } from "zod/v4"
import { ErrorKind } from "schema/api/error"

export const OKResponseValue: OKResponseValue = {
  result: true,
}

export type OKResponseValue = {
  result: true
}

export type IDResponseValue<T> = {
  id: T
}

export interface Response<T> {
  status: number,
  value: T
}

export interface SuccessOKResponse<T> extends Response<T> {
  status: 200,
  value: T
}

export type SuccessResponse<T> = SuccessOKResponse<T>

export type ErrorResponseValue = {
  kind: ErrorKind,
  message: string,
  debug?: unknown,
  details?: unknown
}

export interface ErrorResponse extends Response<ErrorResponseValue> {
  status: 400 | 401 | 403 | 404 | 409 | 500 | 503,
  value: ErrorResponseValue,
}

export class Responses {

  static successOK<T>(value: T): SuccessOKResponse<T> {
    return { status: 200, value }
  }

  static errorBadRequest(issues: string | z.core.$ZodIssue[]): ErrorResponse {
    if (typeof issues === "string") {
      return { status: 400, value: { kind: ErrorKind.BadRequest, message: issues } }
    }
    return { status: 400, value: { kind: ErrorKind.BadRequest, message: issues.map(x => `${x.path.join(".")}: ${x.message}`).join("\n"), details: { issues: issues.map(x => ({ code: x.code, path: x.path.map(p => typeof p === "symbol" ? String(p) : p), message: x.message })) } } }
  }

  static errorUnauthorized(message: string, debug?: unknown): ErrorResponse {
    return { status: 401, value: { kind: ErrorKind.Unauthorized, message, debug } }
  }

  static errorForbidden(message: string, debug?: unknown): ErrorResponse {
    return { status: 403, value: { kind: ErrorKind.Forbidden, message, debug } }
  }

  static errorNotFound(message: string, debug?: unknown): ErrorResponse {
    return { status: 404, value: { kind: ErrorKind.NotFound, message, debug } }
  }

  static errorConflict(message: string, debug?: unknown): ErrorResponse {
    return { status: 409, value: { kind: ErrorKind.Conflict, message, debug } }
  }

  static errorInternalServerError(message: string, debug?: unknown): ErrorResponse {
    return { status: 500, value: { kind: ErrorKind.InternalServerError, message, debug } }
  }

  static errorUnderMaintenance(message: string, details: { stage: "maintenance" | "internal-check" }, debug?: unknown): ErrorResponse {
    return { status: 503, value: { kind: ErrorKind.UnderMaintenance, message, details, debug } }
  }

}
