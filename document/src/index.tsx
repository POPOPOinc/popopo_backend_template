import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"
import React, { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Link, Route, Routes } from "react-router"
import { z } from "zod/v4"
import { RedocPage } from "./redoc-page"

extendZodWithOpenApi(z)

const APIError = lazy(() => import("./api-error").then(m => ({ default: m.APIError })))
const Firestore = lazy(() => import("./firestore").then(m => ({ default: m.Firestore })))

function Top() {
  return <div>
    <h1>API スキーマ</h1>
    <p>schema パッケージの OpenAPI 定義と Zod スキーマから自動生成されたドキュメントです。</p>
    <ul>
      <li><Link to="./firestore">Firestore ドキュメント一覧</Link></li>
      <li><Link to="./api">OpenAPI: App</Link></li>
      <li><Link to="./api-manage">OpenAPI: Manage</Link></li>
      <li><Link to="./api-error">OpenAPI: API Error</Link></li>
    </ul>
  </div>
}

const appElement = document.getElementById("app")
if (!appElement) {
  throw new Error("Failed to find app element")
}

createRoot(appElement).render(
  <BrowserRouter>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Top />} />
        <Route path="/api/*" element={<RedocPage basePath="/api" specUrl="/app_api.yml" />} />
        <Route path="/api-manage/*" element={<RedocPage basePath="/api-manage" specUrl="/manage_api.yml" />} />
        <Route path="/firestore/*" element={<Firestore />} />
        <Route path="/api-error/*" element={<APIError />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)
