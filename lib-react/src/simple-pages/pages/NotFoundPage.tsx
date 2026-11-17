import React, { ReactElement } from "react"
import { SimplePage } from "../components"
import { getMessages } from "../messages"

export function NotFoundPage({ locale, homeUrl }: { locale: string, homeUrl: string }): ReactElement {
  const m = getMessages(locale)
  return <SimplePage title={m.notFound.title} action={{ label: m.backToTop, href: homeUrl }}>
    <p>{m.notFound.body}</p>
  </SimplePage>
}
