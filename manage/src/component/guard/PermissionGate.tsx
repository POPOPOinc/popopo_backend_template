import { Alert } from "react-bootstrap"
import { AdminPermissionType } from "schema"
import { useHasAnyPermission } from "./AccessGuard"

/**
 * 指定された権限のいずれかを持たないユーザーに対して、子要素を「権限がありません」アラートで置き換えるラッパー。
 *
 * ルートのページ全体、タブ・セクション・ボタンなどページ内の個別項目いずれにも適用可能。
 *
 * 「閲覧は許可するが編集だけ不可」を表現したい場合は本コンポーネントは使わず、{@link useHasAnyPermission} の結果を
 * フォーム入力やボタンの `disabled` に渡すことで disabled な見た目で表現する。
 */
export const PermissionGate = ({
  anyOf,
  children,
}: {
  anyOf: AdminPermissionType[]
  children: React.ReactNode
}) => {
  const hasAny = useHasAnyPermission(anyOf)
  if (hasAny) return <>{children}</>

  return (
    <Alert variant="warning" className="mt-3">
      権限がありません。
    </Alert>
  )
}
