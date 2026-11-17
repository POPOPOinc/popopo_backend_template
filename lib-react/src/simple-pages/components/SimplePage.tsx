import React, { ReactElement, ReactNode } from "react"

type Props = {
  title: string
  children?: ReactNode
  action?: { label: string, href: string }
}

/** SSR（renderToString）とブラウザの両方で使えるシンプルなページの枠 */
export function SimplePage({ title, children, action }: Props): ReactElement {
  return <main className="simple-page">
    <h1 className="simple-page__title">{title}</h1>
    <div className="simple-page__body">{children}</div>
    {action && <a className="simple-page__action" href={action.href}>{action.label}</a>}
  </main>
}
