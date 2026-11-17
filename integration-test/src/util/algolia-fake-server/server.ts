import { createServer, IncomingMessage, Server, ServerResponse } from "node:http"
import { AddressInfo } from "node:net"

type AlgoliaObject = { objectID: string } & Record<string, unknown>

type BatchRequest = {
  requests: { action: string, body: AlgoliaObject }[]
}

/**
 * Algolia の REST API（`/1/indexes/{index}/batch`）を模した fake サーバー。
 * Algolia にはエミュレータがないため、統合テストでは app-server の接続先（設定の `algolia.host`）をここに向ける。
 */
export class AlgoliaFakeServer {
  private readonly server: Server
  /** index 名 -> objectID -> object */
  readonly indexes = new Map<string, Map<string, AlgoliaObject>>()
  private taskId = 0

  constructor() {
    this.server = createServer((req, res) => {
      void this.handle(req, res)
    })
  }

  async listen(port = 0): Promise<number> {
    await new Promise<void>(resolve => this.server.listen(port, "127.0.0.1", resolve))
    return (this.server.address() as AddressInfo).port
  }

  async close(): Promise<void> {
    await new Promise<void>(resolve => this.server.close(() => resolve()))
  }

  getObject(index: string, objectID: string): AlgoliaObject | undefined {
    return this.indexes.get(index)?.get(objectID)
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req)
    const match = /^\/1\/indexes\/([^/]+)\/batch$/.exec(req.url?.split("?")[0] ?? "")
    if (req.method === "POST" && match) {
      const index = decodeURIComponent(match[1])
      const objects = this.indexes.get(index) ?? new Map<string, AlgoliaObject>()
      this.indexes.set(index, objects)
      const request = JSON.parse(body) as BatchRequest
      for (const { action, body: object } of request.requests) {
        if (action === "deleteObject") {
          objects.delete(object.objectID)
        } else {
          objects.set(object.objectID, object)
        }
      }
      sendJson(res, 200, { taskID: ++this.taskId, objectIDs: request.requests.map(x => x.body.objectID) })
      return
    }
    sendJson(res, 404, { message: `not implemented in fake server: ${req.method} ${req.url}` })
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", chunk => { data += chunk })
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(value))
}
