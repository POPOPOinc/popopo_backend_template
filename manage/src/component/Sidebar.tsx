import * as FirebaseAuth from "firebase/auth"
import { Button, Nav } from "react-bootstrap"
import { NavLink } from "react-router"
import { AdminPermission, AdminPermissionType, convertAdminPermissionTypeToDisplayString } from "schema"
import { auth } from "../core"
import { Paths } from "../paths"

type MenuItem = {
  label: string
  path: string
  // いずれかの権限を持っていれば表示する。未指定なら全管理者に表示する
  requiredPermissions?: AdminPermissionType[]
}

const menuItems: MenuItem[] = [
  { label: "Users", path: Paths.users.path },
  { label: "Posts", path: Paths.posts.path },
  { label: "操作ログ", path: Paths.adminOperations.path, requiredPermissions: ["ViewAdminAuditLog"] },
]

function hasAnyPermission(adminPermission: AdminPermission, permissions: AdminPermissionType[]): boolean {
  if (adminPermission.kind === "all") return true
  return permissions.some((p) => adminPermission.values.includes(p))
}

export const Sidebar = (props: { email: string | null, adminPermission: AdminPermission }) => (
  <Nav className="flex-column p-3 border-end" style={{ minWidth: 200, minHeight: "100vh" }}>
    {menuItems.map(item => (
      <Nav.Link
        key={item.path}
        as={NavLink}
        to={item.path}
        disabled={item.requiredPermissions != null && !hasAnyPermission(props.adminPermission, item.requiredPermissions)}
      >
        {item.label}
      </Nav.Link>
    ))}
    <hr />
    <small className="text-muted">{props.email}</small>
    <small className="text-muted">
      権限: {props.adminPermission.kind === "all" ? "すべて" : props.adminPermission.values.map(convertAdminPermissionTypeToDisplayString).join("、") || "なし"}
    </small>
    <Button size="sm" variant="outline-secondary" className="mt-2" onClick={() => void FirebaseAuth.signOut(auth)}>ログアウト</Button>
  </Nav>
)
