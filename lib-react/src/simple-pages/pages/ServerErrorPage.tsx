import React, { ReactElement } from "react"
import { SimplePage } from "../components"
import { getMessages } from "../messages"

export function ServerErrorPage({ locale, homeUrl }: { locale: string, homeUrl: string }): ReactElement {
  const m = getMessages(locale)
  return <SimplePage title={m.serverError.title} action={{ label: m.backToTop, href: homeUrl }}>
    <p>{m.serverError.body}</p>
  </SimplePage>
}
