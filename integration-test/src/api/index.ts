import * as appClient from "schema/api/app/client"
import * as debugClient from "schema/api/debug/client"
import * as manageClient from "schema/api/manage/client"
import * as privateClient from "schema/api/private/client"
import { config } from "../core"

export const createMainClient = (getIdToken: () => Promise<string>) =>
  appClient.createClient(appClient.createConfig({ baseUrl: config.baseUrl, auth: getIdToken }))

export const createManageClient = (getIdToken: () => Promise<string>) =>
  manageClient.createClient(manageClient.createConfig({ baseUrl: config.baseUrl, auth: getIdToken }))

/** debug API（本番以外でだけ mount される） */
export const createDebugClient = (getIdToken: () => Promise<string>) =>
  debugClient.createClient(debugClient.createConfig({ baseUrl: config.baseUrl, auth: getIdToken }))

/** private API（サーバー間。プライベート IP からのアクセスだけ通る） */
export const createPrivateApiClient = () =>
  privateClient.createClient(privateClient.createConfig({ baseUrl: config.baseUrl }))
