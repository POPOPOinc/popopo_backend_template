import { useCountUsers, useUsersPage } from "lib-front/firestore-access"
import { usePagingQuery } from "lib-front/hook"
import { Badge, Col, Row, Table } from "react-bootstrap"
import { NavLink } from "react-router"
import { firestore } from "../core"
import { NavLinkPaging } from "../component/NavLinkPaging"
import { Spinner } from "../component/Spinner"
import { Paths } from "../paths"

export const Users = () => {
  const { pagePosition, generateQuery } = usePagingQuery({
    initialPageSize: 20,
  })
  const result = useUsersPage(firestore, pagePosition)
  const total = useCountUsers(firestore)

  return (
    <div className="container mt-5">
      <Row className="pb-2">
        <Col md="auto">
          <h4>Users一覧 (計: {total === "loading" ? <Spinner /> : <>{total}件</>})</h4>
        </Col>
      </Row>
      <Row>
        <Col>
          {result === "loading" ? (
            <Spinner />
          ) : (
            <>
              <Table striped bordered hover>
                <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>作成日時</th>
                </tr>
                </thead>
                <tbody>
                {result.docs.map((user) => (
                  <tr key={user.id}>
                    <td><code>{user.id}</code></td>
                    <td><NavLink to={Paths.users.user.getPath(user.id)}>{user.display_name}</NavLink></td>
                    <td><Badge bg={user.status === "active" ? "success" : "danger"}>{user.status}</Badge></td>
                    <td>{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                </tbody>
              </Table>
              <NavLinkPaging
                prev={result.prev && Paths.users.path + "?" + generateQuery({ until: result.prev })}
                next={result.next && Paths.users.path + "?" + generateQuery({ start: result.next })}
              />
            </>
          )}
        </Col>
      </Row>
    </div>
  )
}
