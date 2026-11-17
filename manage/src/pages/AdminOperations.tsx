import { useAdminOperationsPage } from "lib-front/firestore-access"
import { usePagingQuery } from "lib-front/hook"
import { Col, Row, Table } from "react-bootstrap"
import { NavLink } from "react-router"
import { AdminOperationDocument, AdminOperationTargetKind } from "schema"
import { firestore } from "../core"
import { NavLinkPaging } from "../component/NavLinkPaging"
import { Spinner } from "../component/Spinner"
import { Paths } from "../paths"

const Target = ({ operation }: { operation: AdminOperationDocument }) => {
  switch (operation.target.kind) {
    case AdminOperationTargetKind.user:
      return <NavLink to={Paths.users.user.getPath(operation.target.value.id)}>{operation.target.value.display_name}</NavLink>
    case AdminOperationTargetKind.post:
      return <>{operation.target.value.id}</>
    default:
      return operation.target satisfies never
  }
}

/** 管理者の操作ログ（監査ログ）。API を経由せず Firestore から直接読む */
export const AdminOperations = () => {
  const { pagePosition, generateQuery } = usePagingQuery({
    initialPageSize: 20,
  })
  const result = useAdminOperationsPage(firestore, pagePosition)

  return (
    <div className="container mt-5">
      <Row className="pb-2">
        <Col md="auto">
          <h4>操作ログ</h4>
        </Col>
      </Row>
      {result === "loading" ? <Spinner /> : (
        <>
          <Table striped bordered hover>
            <thead>
            <tr>
              <th>日時</th>
              <th>操作</th>
              <th>対象</th>
              <th>管理者</th>
              <th>内容</th>
            </tr>
            </thead>
            <tbody>
            {result.docs.map((operation) => (
              <tr key={operation.id}>
                <td>{new Date(operation.created_at).toLocaleString()}</td>
                <td>{operation.kind}</td>
                <td><Target operation={operation} /></td>
                <td>{operation.admin_user.email}</td>
                <td><code>{JSON.stringify(operation.value)}</code></td>
              </tr>
            ))}
            </tbody>
          </Table>
          <NavLinkPaging
            prev={result.prev && Paths.adminOperations.path + "?" + generateQuery({ until: result.prev })}
            next={result.next && Paths.adminOperations.path + "?" + generateQuery({ start: result.next })}
          />
        </>
      )}
    </div>
  )
}
