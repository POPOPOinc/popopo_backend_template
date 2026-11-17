import { deleteApp, initializeApp, type App } from 'firebase-admin/app'
import {beforeAll, afterAll} from '@jest/globals'

const projectId = 'demo-template'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081'

let app: App | undefined

beforeAll(async () => {
  app = initializeApp({
    projectId: projectId
  })
})

afterAll(async () => {
  if (app) await deleteApp(app)
})
