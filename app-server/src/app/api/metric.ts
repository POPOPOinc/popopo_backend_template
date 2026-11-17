import { Request, Response } from "express"
import { MetricEntry, renderPrometheusMetrics, collectNodejsMemoryMetrics } from "lib-server/metrics/index"

const responseCounter: Record<string, number> = {}

export function onHTTPResponse(_req: Request, res: Response) {
  const category = `${Math.trunc(res.statusCode / 100)}`
  responseCounter[category] ??= 0
  responseCounter[category]++
}

export function renderApiPrometheusMetrics(): string {
  const entries: MetricEntry[] = []

  for (const [code, count] of Object.entries(responseCounter)) {
    entries.push({ kind: "counter", name: "api_result", labels: { code }, value: count })
  }

  return renderPrometheusMetrics([...entries, ...collectNodejsMemoryMetrics()])
}
