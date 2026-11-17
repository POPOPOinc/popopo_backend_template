import * as FirebaseAuth from "firebase/auth"
import { useAdmin } from "lib-front/firestore-access"
import { useEffect, useState } from "react"
import { Alert, Button, Container, Form } from "react-bootstrap"
import { Outlet, useOutletContext } from "react-router"
import { AdminDocument, AdminId, AdminPermissionType, LoadingOption } from "schema"
import { auth, firestore } from "../../core"
import { Sidebar } from "../Sidebar"
import { Spinner } from "../Spinner"

function useFirebaseUser(): LoadingOption<FirebaseAuth.User> {
  const [user, setUser] = useState<LoadingOption<FirebaseAuth.User>>("loading")
  useEffect(() => auth.onIdTokenChanged(setUser), [])
  return user
}

type AccessContext = {
  firebaseUser: FirebaseAuth.User
  admin: AdminDocument
}

function useAccessContext() {
  return useOutletContext<AccessContext>()
}

function hasPermission(context: AccessContext, permission: AdminPermissionType): boolean {
  if (context.admin.permission.kind === "all") return true
  return context.admin.permission.values.includes(permission)
}

/**
 * 指定された権限のいずれかを持っているかを返す。
 * フォームの `disabled` / `readOnly` 等、コンポーネントの分岐に使う。表示そのものの差し替えは {@link PermissionGate} を使う。
 */
export const useHasAnyPermission = (anyOf: AdminPermissionType[]): boolean => {
  const context = useAccessContext()
  return anyOf.some((p) => hasPermission(context, p))
}

const LoginForm = () => {
  const [error, setError] = useState<string | null>(null)
  return (
    <Form className="mt-5" style={{ maxWidth: 400 }} onSubmit={e => {
      e.preventDefault()
      const form = new FormData(e.currentTarget)
      FirebaseAuth.signInWithEmailAndPassword(auth, String(form.get("email")), String(form.get("password"))).catch(cause => setError(String(cause)))
    }}>
      <h1>Manage</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form.Control name="email" type="email" placeholder="admin@example.com" className="mb-2" required />
      <Form.Control name="password" type="password" placeholder="password" className="mb-2" required />
      <Button type="submit">ログイン</Button>
    </Form>
  )
}

/** Firebase Auth（manage 用テナント）でログインし、admins コレクションに登録された管理者だけが子ルートを表示できる */
export const AccessGuard = () => {
  const firebaseUser = useFirebaseUser()
  // admins/{uid} を購読する（rules で本人だけが読める。ドキュメントがなければ null）
  const admin = useAdmin(firestore, firebaseUser === "loading" || firebaseUser === null ? firebaseUser : AdminId(firebaseUser.uid))

  if (firebaseUser === "loading" || admin === "loading") {
    return <Spinner />
  }
  if (firebaseUser === null) {
    return <Container><LoginForm /></Container>
  }
  if (admin === null) {
    return (
      <Container>
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>Manage を利用できないアカウントです</Alert.Heading>
          <p>admins コレクションへの登録が必要です。Firebase ID: <code>{firebaseUser.uid}</code></p>
          <Button onClick={() => void FirebaseAuth.signOut(auth)}>ログアウト</Button>
        </Alert>
      </Container>
    )
  }
  return (
    <div className="d-flex">
      <Sidebar email={firebaseUser.email} adminPermission={admin.permission} />
      <Container fluid>
        <Outlet context={{ firebaseUser, admin } satisfies AccessContext} />
      </Container>
    </div>
  )
}
