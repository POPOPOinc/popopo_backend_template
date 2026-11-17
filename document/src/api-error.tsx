import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi"
import React, { ReactElement } from "react"
import { RedocStandalone } from "redoc"
import { Errors } from "schema/api/error"
import { z } from "zod/v4"

const registry = new OpenAPIRegistry()

const description: string[] = []

Object.keys(Errors).forEach((e) => {
  const key = e as keyof typeof Errors
  const error: { status: number, details?: z.ZodType } = Errors[key]
  registry.register(key, z.object({
    kind: z.literal(key),
    message: z.string().describe("開発者向けのエラーメッセージが入ります").optional(),
    ...(error.details ? { details: error.details } : {}),
  }).describe(`HTTP ${error.status}`))
  description.push(`## ${key}\n<SchemaDefinition schemaRef="#/components/schemas/${key}" />`)
})

const schema = new OpenApiGeneratorV3(registry.definitions)
  .generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "API Error Documents",
    },
  })

/** schema の Errors（kind と details の Zod 定義）から生成するエラーの一覧 */
export function APIError(): ReactElement {
  return <RedocStandalone
    basePath="/api-error"
    spec={{
      ...schema,
      tags: [{
        name: "Error Models",
        "x-displayName": "All Models",
        description: description.join("\n"),
      }],
    }}
    options={{
      disableTelemetry: true,
    }} />
}
