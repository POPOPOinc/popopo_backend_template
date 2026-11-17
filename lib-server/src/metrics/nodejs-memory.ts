import v8 from "node:v8"
import { MetricEntry } from "./types"

/**
 * Node.js プロセスのメモリ関連メトリクスを MetricEntry[] として返す。
 * process.memoryUsage() と v8.getHeapStatistics() から収集する。
 */
export function collectNodejsMemoryMetrics(): MetricEntry[] {
  const mem = process.memoryUsage()
  const heap = v8.getHeapStatistics()

  return [
    { kind: "gauge", name: "nodejs_rss_bytes", labels: {}, value: mem.rss },
    { kind: "gauge", name: "nodejs_heap_total_bytes", labels: {}, value: mem.heapTotal },
    { kind: "gauge", name: "nodejs_heap_used_bytes", labels: {}, value: mem.heapUsed },
    { kind: "gauge", name: "nodejs_external_bytes", labels: {}, value: mem.external },
    { kind: "gauge", name: "nodejs_array_buffers_bytes", labels: {}, value: mem.arrayBuffers },
    { kind: "gauge", name: "nodejs_heap_size_limit_bytes", labels: {}, value: heap.heap_size_limit },
  ]
}
