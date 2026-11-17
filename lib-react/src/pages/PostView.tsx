import React, { ReactElement } from "react"

export type PostViewProps = {
  authorName: string
  body: string
  createdAt: number
}

/** 投稿 1 件の表示。web の SSR（functions）と SPA の両方から使う */
export function PostView({ authorName, body, createdAt }: PostViewProps): ReactElement {
  return <article className="post-view">
    <header className="post-view__author">{authorName}</header>
    <p className="post-view__body">{body}</p>
    <time className="post-view__time" dateTime={new Date(createdAt).toISOString()}>{new Date(createdAt).toLocaleString("ja-JP")}</time>
  </article>
}
