export type Try<Ok, Err> = {
  readonly ok?: never
  readonly err: Err
} | {
  readonly ok: Ok
  readonly err?: never
}

export const ok: Try<{}, never> = { ok: {} }
