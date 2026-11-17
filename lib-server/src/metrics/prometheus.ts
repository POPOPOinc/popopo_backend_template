import { MetricEntry } from "./types"

/**
 * MetricEntry[] を Prometheus テキスト形式 (text/plain; version=0.0.4) に変換する。
 */
export function renderPrometheusMetrics(metrics: MetricEntry[]): string {
  const metricsByName = new Map<string, MetricEntry[]>()

  for (const metric of metrics) {
    const entries = metricsByName.get(metric.name)
    if (entries != null) {
      entries.push(metric)
    } else {
      metricsByName.set(metric.name, [metric])
    }
  }

  const rows: string[] = []

  for (const [name, entries] of metricsByName) {
    if (entries.length === 0) continue

    rows.push(`# TYPE ${name} ${entries[0].kind}`)

    for (const entry of entries) {
      const labelPairs = Object.entries(entry.labels)
      // ラベルなしの場合は "metric_name value" 形式で出力する（Prometheus 標準形式）
      if (0 < labelPairs.length) {
        const labelsStr = labelPairs.map(([k, v]) => `${k}="${v}"`).join(",")
        rows.push(`${name}{${labelsStr}} ${entry.value}`)
      } else {
        rows.push(`${name} ${entry.value}`)
      }
    }
  }

  return rows.join("\n") + "\n"
}
