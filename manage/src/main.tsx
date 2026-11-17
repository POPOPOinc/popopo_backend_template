import "bootstrap/dist/css/bootstrap.min.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import { AccessGuard } from "./component/guard/AccessGuard"
import { AdminOperations } from "./pages/AdminOperations"
import { Posts } from "./pages/Posts"
import { Users } from "./pages/Users"
import { UserDetail } from "./pages/users/UserDetail"
import { PermissionGate } from "./component/guard/PermissionGate"
import { Paths } from "./paths"

const screen = document.getElementById("screen")
if (!screen) {
  throw new Error("Failed to find #screen")
}
createRoot(screen).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AccessGuard />}>
          <Route path={Paths.top.path} element={<Navigate to={Paths.users.path} replace />} />
          <Route path={Paths.users.path} element={<Users />} />
          <Route path={Paths.users.user.path} element={<UserDetail />} />
          <Route path={Paths.posts.path} element={<Posts />} />
          <Route path={Paths.adminOperations.path} element={<PermissionGate anyOf={["ViewAdminAuditLog"]}><AdminOperations /></PermissionGate>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
