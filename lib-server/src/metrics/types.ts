export type CounterMetricEntry = {
  kind: "counter"
  name: string
  labels: Record<string, string>
  value: number
}

export type GaugeMetricEntry = {
  kind: "gauge"
  name: string
  labels: Record<string, string>
  value: number
}

export type MetricEntry = CounterMetricEntry | GaugeMetricEntry
