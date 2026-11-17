import { useCountPosts, usePostsPage } from "lib-front/firestore-access"
import { usePagingQuery } from "lib-front/hook"
import { useState } from "react"
import { Badge, Button, Col, Modal, Row, Table } from "react-bootstrap"
import { NavLink } from "react-router"
import { PostDocument } from "schema"
import { manageDeletePost, manageUpdatePost, type ManageUpdatePostRequest } from "schema/api/manage"
import { apiManage, firestore } from "../core"
import { NavLinkPaging } from "../component/NavLinkPaging"
import { Spinner } from "../component/Spinner"
import { PostDisplayPeriodForm } from "../component/form/PostDisplayPeriodForm"
import { useHasAnyPermission } from "../component/guard/AccessGuard"
import { Paths } from "../paths"

const deletePost = async (post: PostDocument) => {
  if (!window.confirm(`「${post.body}」を削除しますか？`)) {
    return
  }
  const { error } = await manageDeletePost({
    client: apiManage,
    path: { post_id: post.id },
  })
  window.alert(error ? error.message : "削除しました")
}

const updatePost = async (post: PostDocument, body: ManageUpdatePostRequest) => {
  const { error } = await manageUpdatePost({
    client: apiManage,
    path: { post_id: post.id },
    body,
  })
  window.alert(error ? error.message : "更新しました")
}

const formatPeriod = (post: PostDocument) =>
  `${new Date(post.display_period.start_at).toLocaleString()} ～ ${post.display_period.end_at === null ? "無期限" : new Date(post.display_period.end_at).toLocaleString()}`

export const Posts = () => {
  const canEdit = useHasAnyPermission(["EditPost"])
  const [editing, setEditing] = useState<PostDocument | null>(null)
  const { pagePosition, generateQuery } = usePagingQuery({
    initialPageSize: 20,
  })
  const result = usePostsPage(firestore, pagePosition)
  const total = useCountPosts(firestore)

  return (
    <div className="container mt-5">
      <Row className="pb-2">
        <Col md="auto">
          <h4>Posts一覧 (計: {total === "loading" ? <Spinner /> : <>{total}件</>})</h4>
        </Col>
      </Row>
      {result === "loading" ? <Spinner /> : (
        <>
          <Table striped bordered hover>
            <thead>
            <tr>
              <th>本文</th>
              <th>投稿者</th>
              <th>表示期間</th>
              <th>作成日時</th>
              <th></th>
            </tr>
            </thead>
            <tbody>
            {result.docs.map((post) => (
              <tr key={post.id}>
                <td>{post.body}</td>
                <td><NavLink to={Paths.users.user.getPath(post.user_id)}>{post.author.display_name}</NavLink></td>
                <td>
                  <Badge bg={post.display_period_state.active ? "success" : "secondary"}>{post.display_period_state.active ? "表示中" : "表示期間外"}</Badge>{" "}
                  {formatPeriod(post)}
                </td>
                <td>{new Date(post.created_at).toLocaleString()}</td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-2" disabled={!canEdit} onClick={() => setEditing(post)}>期間を変更</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => void deletePost(post)}>削除</Button>
                </td>
              </tr>
            ))}
            </tbody>
          </Table>
          <NavLinkPaging
            prev={result.prev && Paths.posts.path + "?" + generateQuery({ until: result.prev })}
            next={result.next && Paths.posts.path + "?" + generateQuery({ start: result.next })}
          />
        </>
      )}
      <Modal show={editing !== null} onHide={() => setEditing(null)}>
        <Modal.Header closeButton><Modal.Title>表示期間の変更</Modal.Title></Modal.Header>
        <Modal.Body>
          {editing && (
            <PostDisplayPeriodForm
              key={editing.id}
              disabled={!canEdit}
              defaultValues={{ display_period: editing.display_period }}
              onSubmit={async (body) => {
                await updatePost(editing, body)
                setEditing(null)
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}
