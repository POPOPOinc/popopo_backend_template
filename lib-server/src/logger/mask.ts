/**
 * Blacklist-based masking for sensitive headers and parameters.
 * This module provides functionality to mask sensitive information
 * before writing to logs.
 */

const MASKED_VALUE = "[MASKED]"

/**
 * Blacklist of header names to mask (case-insensitive).
 * Add new headers here to mask them in logs.
 */
const BLACKLISTED_HEADERS: string[] = [
  "x-manage-secret-token",
  "x-id-token",
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-refresh-token",
  "x-session-token",
  "x-csrf-token",
  "x-xsrf-token",
]

/**
 * Blacklist of parameter names to mask (case-insensitive).
 * Add new parameters here to mask them in logs.
 */
const BLACKLISTED_PARAMS: string[] = [
  "token",
  "secret",
  "password",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "id_token",
  "session_token",
  "auth_token",
  "secret_token",
  "private_key",
  "credential",
  "credentials",
]

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, "")
}

function isBlacklistedHeader(key: string): boolean {
  const normalizedKey = normalizeKey(key)
  return BLACKLISTED_HEADERS.some(header => normalizeKey(header) === normalizedKey)
}

function isBlacklistedParam(key: string): boolean {
  const normalizedKey = normalizeKey(key)
  return BLACKLISTED_PARAMS.some(param => normalizeKey(param) === normalizedKey)
}

function isBlacklisted(key: string): boolean {
  return isBlacklistedHeader(key) || isBlacklistedParam(key)
}

/**
 * Recursively masks sensitive values in an object.
 * Handles circular references by replacing them with "[Circular]".
 * @param obj The object to mask
 * @returns A new object with sensitive values masked
 */
export function maskSensitiveData(obj: unknown): unknown {
  return maskSensitiveDataInternal(obj, new WeakSet())
}

function maskSensitiveDataInternal(obj: unknown, seen: WeakSet<object>): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== "object") {
    return obj
  }

  if (seen.has(obj)) {
    return "[Circular]"
  }
  seen.add(obj)

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveDataInternal(item, seen))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isBlacklisted(key)) {
      result[key] = MASKED_VALUE
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitiveDataInternal(value, seen)
    } else {
      result[key] = value
    }
  }
  return result
}
