import { Locale, locales } from "schema"

const SUPPORTED_LANGS = new Set<string>(locales)

/**
 * Accept-Language ヘッダーから、対応している言語のうち最も優先度の高いものを返す
 * @param header Accept-Language ヘッダーの値（例: "ja,en-US;q=0.9,en;q=0.8"）
 * @returns 対応する言語がなければ既定の言語（locales の先頭）
 */
export function detectPreferredLang(header?: string): Locale {
  const fallback = locales[0] ?? "ja"
  if (!header) {
    return fallback
  }

  const preferences = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";")
      let q = 1.0
      for (const param of params) {
        const [key, value] = param.trim().split("=")
        if (key === "q" && value !== undefined) {
          const parsed = parseFloat(value)
          if (!isNaN(parsed)) {
            q = parsed
          }
        }
      }
      return { tag: tag.toLowerCase(), q }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of preferences) {
    const baseLang = tag.split("-")[0] ?? ""
    if (SUPPORTED_LANGS.has(baseLang)) {
      return baseLang as Locale
    }
  }

  return fallback
}
