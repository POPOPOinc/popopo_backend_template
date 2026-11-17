import React, { ReactElement } from "react"

export type UserViewProps = {
  displayName: string
  createdAt: number
}

/** ユーザーのプロフィール表示。web の SSR（functions）と SPA の両方から使う */
export function UserView({ displayName, createdAt }: UserViewProps): ReactElement {
  return <article className="user-view">
    <h1 className="user-view__name">{displayName}</h1>
    <time className="user-view__time" dateTime={new Date(createdAt).toISOString()}>{new Date(createdAt).toLocaleDateString("ja-JP")} から利用</time>
  </article>
}
