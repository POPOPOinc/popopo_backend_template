import { defineConfig } from "@hey-api/openapi-ts"

const apis = ["app", "manage", "debug", "private"] as const

export default defineConfig(apis.map((name) => ({
  input: `./api/${name}_api.yml`,
  output: `./src/api/${name}`,
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@hey-api/client-fetch",
    {
      name: "zod",
      compatibilityVersion: 4,
      metadata: true,
      "~resolvers": {
        string(ctx) {
          // format: user-free-input は、ユーザーが自由に入力する文字列。前後の空白を除いてから長さを検査する
          if (ctx.schema.format === "user-free-input") {
            const { $, symbols } = ctx
            ctx.nodes.base = () => $(symbols.z).attr("string").call().attr("trim").call()
            ctx.nodes.format = () => undefined
          }
        },
      },
    },
  ],
})))
