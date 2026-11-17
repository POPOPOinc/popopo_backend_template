import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth"
import { usePosts, usePublicPostsByUser, useUser } from "lib-front/firestore-access"
import { PostView } from "lib-react/pages"
import { FormEvent, ReactElement, useEffect, useState } from "react"
import { UserId } from "schema"
import { createPost, registerUser } from "schema/api/app"
import { api, auth, firestore } from "../core"

/** SPA のトップ。匿名ログイン → ユーザー登録 → 投稿の一覧と作成。読み取りは Firestore を直接読み、書き込みは API を使う */
export function Top(): ReactElement {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const user = useUser(firestore, firebaseUser ? UserId(firebaseUser.uid) : "loading")
  const [authorFilter, setAuthorFilter] = useState<UserId | null>(null)
  const allPosts = usePosts(firestore, 20)
  const authorPosts = usePublicPostsByUser(firestore, authorFilter ?? UserId(""), 20)
  const posts = authorFilter === null ? allPosts : authorPosts
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onAuthStateChanged(auth, u => {
    if (u === null) {
      void signInAnonymously(auth)
    }
    setFirebaseUser(u)
  }), [])

  const register = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = new FormData(e.currentTarget).get("display_name")
    const { error } = await registerUser({ client: api, body: { display_name: String(name ?? "") } })
    setError(error ? error.message : null)
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { error } = await createPost({ client: api, body: { body } })
    if (error) {
      setError(error.message)
      return
    }
    setBody("")
  }

  if (user === "loading") {
    return <main><p>Loading...</p></main>
  }
  return <main>
    <h1>Web Template</h1>
    {error && <p role="alert">{error}</p>}
    {user === null
      ? <form onSubmit={e => void register(e)}>
        <input name="display_name" placeholder="表示名" required />
        <button type="submit">登録</button>
      </form>
      : <>
        <p>{user.display_name} としてログイン中</p>
        <form onSubmit={e => void submit(e)}>
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="いまどうしてる？" required />
          <button type="submit">投稿</button>
        </form>
        {authorFilter !== null && <button type="button" onClick={() => setAuthorFilter(null)}>すべての投稿を表示</button>}
        {posts === "loading" ? <p>Loading...</p> : posts.map(post => <div key={post.id}>
          <a href={`/posts/${post.id}`}>
            <PostView authorName={post.author.display_name} body={post.body} createdAt={post.created_at} />
          </a>
          <button type="button" onClick={() => setAuthorFilter(post.user_id)}>{post.author.display_name} さんの投稿だけを表示</button>
        </div>)}
      </>}
  </main>
}
