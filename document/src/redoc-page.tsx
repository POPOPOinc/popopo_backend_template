import React, { ReactElement } from "react"
import { RedocStandalone } from "redoc"

// Redoc 3 は画面内の項目ごとに URL を持つので、Route の位置を basePath で渡す
type Props = { basePath: string } & ({ specUrl: string } | { spec: object })

export function RedocPage({ basePath, ...props }: Props): ReactElement {
  const source = "spec" in props ? { spec: { ...props.spec } } : props
  return <RedocStandalone
    {...source}
    basePath={basePath}
    options={{
      disableTelemetry: true,
    }}
  />
}
