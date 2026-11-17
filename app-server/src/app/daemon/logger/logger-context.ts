import { randomUUID } from "crypto"
import { type DaemonLoggerContext } from "lib-server"
import { config } from "../../../config"


export function createDaemonLoggerContext(daemonName: string): DaemonLoggerContext {
  const requestId = randomUUID()
  const traceId = `projects/${config.firebase.projectId}/traces/${requestId}`

  return {
    requestId,
    traceId: traceId,
    daemon: {
      name: daemonName
    }
  }
}
