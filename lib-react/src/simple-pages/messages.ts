export type Locale = "ja" | "en"

export const messages = {
  ja: {
    notFound: { title: "ページが見つかりません", body: "お探しのページは削除されたか、URL が間違っている可能性があります。" },
    serverError: { title: "エラーが発生しました", body: "時間をおいて再度お試しください。" },
    backToTop: "トップへ戻る",
  },
  en: {
    notFound: { title: "Page Not Found", body: "The page you are looking for may have been removed or the URL may be incorrect." },
    serverError: { title: "An Error Occurred", body: "Please try again later." },
    backToTop: "Back to top",
  },
} as const satisfies Record<Locale, unknown>

export function getMessages(locale: string) {
  return locale === "en" ? messages.en : messages.ja
}
