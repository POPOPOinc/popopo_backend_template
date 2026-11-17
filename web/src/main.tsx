import { NotFoundPage } from "lib-react/simple-pages"
import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import { Top } from "./pages/Top"
import "./style.css"

const screen = document.getElementById("screen")
if (!screen) {
  throw new Error("Failed to find #screen")
}

// /posts/:postId などの公開ページは functions（renderHTML）で SSR 済みなので、そのまま表示する
if (!screen.hasChildNodes()) {
  createRoot(screen).render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Top />} />
        <Route path="*" element={<NotFoundPage locale="ja" homeUrl="/" />} />
      </Routes>
    </BrowserRouter>,
  )
}
