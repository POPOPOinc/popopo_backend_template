import React, { ReactElement } from "react"
import { documents, generateSchema } from "./documents"
import { RedocPage } from "./redoc-page"

const schema = generateSchema(documents)

export function Firestore(): ReactElement {
  return <RedocPage basePath="/firestore" spec={schema} />
}
