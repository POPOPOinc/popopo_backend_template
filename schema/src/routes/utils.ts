import { locales } from "./types"

export function buildPath<Params extends Record<string, unknown>>(
  pattern: string,
  params: Params
): string {
  let path = pattern
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, String(value))
  }
  return path
}

export function patternToRegex(pattern: string, options: { withLocale?: boolean } = {}): RegExp {
  let regexPattern = pattern.replace(/:([^/]+)/g, "([^/]+)")
  if (options.withLocale) {
    const localePattern = `(${locales.join("|")})`
    regexPattern = `/${localePattern}${regexPattern}`
  }
  return new RegExp(`^${regexPattern}$`)
}
