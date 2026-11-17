import { ManagedFloatingSelect, ManagedInput, LoadingButton } from "lib-front/component"
import { useAllPostsByUser, useUser } from "lib-front/firestore-access"
import { useZodForm } from "lib-front/zod-form"
import { useEffect, useState } from "react"
import { Alert, Card, Col, Form, Row, Table } from "react-bootstrap"
import { FormProvider } from "react-hook-form"
import { useParams } from "react-router"
import { UserDocument, UserId, UserStatus } from "schema"
import { manageGetUserAuth, manageUpdateUser, type UserAuthResponse } from "schema/api/manage"
import { zManageUpdateUserRequest } from "schema/api/manage/zod"
import { apiManage, firestore } from "../../core"
import { Spinner } from "../../component/Spinner"
import { useHasAnyPermission } from "../../component/guard/AccessGuard"

const UserEditForm = (props: { user: UserDocument }) => {
  // 閲覧は許可し、EditUser の権限がなければフォームを disabled にする（API 側も 403 を返す）
  const canEdit = useHasAnyPermission(["EditUser"])
  const [message, setMessage] = useState<{ variant: "success" | "danger", text: string } | null>(null)
  const form = useZodForm({
    schema: zManageUpdateUserRequest,
    mode: "onChange",
    defaultValues: {
      display_name: props.user.display_name,
      status: props.user.status,
    },
  })
  const { isSubmitting, isValid } = form.formState

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(async (data) => {
        const { error } = await manageUpdateUser({
          client: apiManage,
          path: { user_id: props.user.id },
          body: data,
        })
        setMessage(error ? { variant: "danger", text: error.message } : { variant: "success", text: "更新しました" })
      })}>
        {message && <Alert variant={message.variant}>{message.text}</Alert>}
        {!canEdit && <Alert variant="secondary">ユーザー編集の権限がありません</Alert>}
        <fieldset disabled={!canEdit}>
          <ManagedInput control={form.control} name="display_name" label="表示名" required />
          <ManagedFloatingSelect control={form.control} name="status" label="利用状態" options={UserStatus.options.map(x => ({ value: x, label: x }))} />
          <LoadingButton type="submit" isLoading={isSubmitting} isValid={isValid && canEdit}>更新</LoadingButton>
        </fieldset>
      </Form>
    </FormProvider>
  )
}

const UserAuthCard = (props: { userId: UserId }) => {
  const canEdit = useHasAnyPermission(["EditUser"])
  if (!canEdit) {
    return <p>ユーザー編集の権限がありません</p>
  }
  return <UserAuthInfo userId={props.userId} />
}

const UserAuthInfo = (props: { userId: UserId }) => {
  const [authInfo, setAuthInfo] = useState<UserAuthResponse | "loading" | null>("loading")
  useEffect(() => {
    void (async () => {
      const { data } = await manageGetUserAuth({
        client: apiManage,
        path: { user_id: props.userId },
      })
      setAuthInfo(data ?? null)
    })()
  }, [props.userId])

  if (authInfo === "loading") {
    return <Spinner />
  }
  if (authInfo === null) {
    return <p>Firebase Auth のアカウントが見つかりません</p>
  }
  return (
    <dl>
      <dt>Email</dt><dd>{authInfo.email ?? "-"}</dd>
      <dt>Providers</dt><dd>{authInfo.provider_ids.join(", ") || "-"}</dd>
      <dt>Disabled</dt><dd>{String(authInfo.disabled)}</dd>
      <dt>作成日時</dt><dd>{authInfo.created_at}</dd>
      <dt>最終ログイン</dt><dd>{authInfo.last_sign_in_at ?? "-"}</dd>
    </dl>
  )
}

export const UserDetail = () => {
  const { userId } = useParams()
  const user = useUser(firestore, userId ? UserId(userId) : null)
  const posts = useAllPostsByUser(firestore, UserId(userId ?? ""), 20)

  if (user === "loading") {
    return <Spinner />
  }
  if (user === null) {
    return <p className="mt-5">ユーザーが見つかりません</p>
  }
  return (
    <div className="container mt-5">
      <h4>{user.display_name} <small className="text-muted"><code>{user.id}</code></small></h4>
      <Row>
        <Col md={6}>
          <Card className="mb-3"><Card.Body><UserEditForm key={user.updated_at} user={user} /></Card.Body></Card>
        </Col>
        <Col md={6}>
          <Card className="mb-3"><Card.Header>Firebase Auth</Card.Header><Card.Body><UserAuthCard userId={user.id} /></Card.Body></Card>
        </Col>
      </Row>
      <h5>投稿</h5>
      {posts === "loading" ? <Spinner /> : (
        <Table striped bordered>
          <tbody>
          {posts.map(post => (
            <tr key={post.id}><td>{post.body}</td><td>{new Date(post.created_at).toLocaleString()}</td></tr>
          ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
