import express from "express"
import { renderApiPrometheusMetrics } from "../metric"

/**
 * Prometheus 形式のメトリクス。ローカルや常駐プロセスとして動かすときに scrape する。
 * Cloud Functions ではインスタンスごとにカウンタが分かれるため、Cloud Monitoring の組み込みメトリクスを使う。
 */
export const statsApp = express.Router()

statsApp.get("/metrics", (_req, res) => {
  res.status(200)
  res.contentType("text/plain; version=0.0.4; charset=utf-8")
  res.send(renderApiPrometheusMetrics())
})
