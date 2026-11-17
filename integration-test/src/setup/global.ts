import { config, logger } from "../core"

export default (): void => {
  logger.info("=======")
  logger.info(`ProjectId: ${config.firebase.projectId}`)
  logger.info(`Ops TenantId: ${config.ops.tenantId}`)
  logger.info("=======")
}
