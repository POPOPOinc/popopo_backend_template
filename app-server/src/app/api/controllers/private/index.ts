import { Request, Response } from "express"
import { logger } from "lib-server"
import { config } from "../../../../config"

/**
 * リクエストから remoteAddress を解決する。
 * テスト用: ローカル（エミュレータを含む）に限り、__ip クエリパラメータの値を使用する。
 * beta / stage も Functions で公開されているので、デプロイ環境では上書きを許さない。
 */
export function resolveRemoteAddress(req: Request): string | undefined {
  if (config.env === "local" && typeof req.query["__ip"] === "string") {
    return req.query["__ip"]
  }
  return req.socket.remoteAddress
}

/**
 * プライベート IP アドレスからのアクセスだけを通す（元の k8s 構成では、クラスタ内からの呼び出しだけを通していた）。
 * Cloud Functions では、通常は呼び出し元の IP がプライベートにならないので、この判定だけでは守れない
 * （VPC コネクタなどの構成によってはプライベート IP になりうる）。
 * デプロイ環境でサーバー間の通信を受ける場合は、関数の IAM（roles/run.invoker を呼び出し元のサービスアカウントだけに付ける）か、
 * ID トークンの検証で守ること。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Express middleware next function has any return type
export function privateAuth(req: Request, res: Response, next: () => any) {
  const remoteAddress = resolveRemoteAddress(req)
  if (!remoteAddress || !isPrivateIp(remoteAddress)) {
    logger.warn("外部からのアクセスをブロックしました", { ip: remoteAddress, path: req.path })
    res.sendStatus(404)
    return
  }
  next()
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
    return true
  }
  const parts = ip.replace(/^::ffff:/, "").split(".").map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false
  }
  const [a, b] = parts
  switch (a) {
    case 10:
      return true
    case 172:
      return 16 <= b && b <= 31
    case 192:
      return b === 168
    default:
      return false
  }
}
