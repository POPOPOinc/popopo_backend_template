export class Env {

  /** Cloud Functions では設定全体を Secret Manager（defineSecret("APP_SERVER_CONFIG")）から JSON 文字列で受け取る */
  static get configJson(): string | undefined {
    return process.env.APP_SERVER_CONFIG
  }

  static get configFileOverride(): string | undefined {
    return process.env.CONFIG_FILE_OVERRIDE
  }

  static get host(): string {
    return process.env.HOST || "localhost"
  }

  static get port(): number {
    return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
  }

  static get FIRESTORE_EMULATOR_HOST(): string | undefined {
    return process.env.FIRESTORE_EMULATOR_HOST
  }

}
