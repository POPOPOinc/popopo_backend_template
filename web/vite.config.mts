import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL(`./env/${mode}`, import.meta.url)),
    },
  },
  server: {
    host: "localhost",
    port: 3001,
  },
  publicDir: "public",
  build: {
    outDir: `./dist/${mode}`,
    sourcemap: true,
    manifest: true, // SSR で CSS パスを取得するため（scripts/generate-css-paths.cjs）
  },
}))
