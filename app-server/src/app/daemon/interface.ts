export type DaemonContext = {
  abortSignal: AbortSignal
}

export type DaemonDefinition = {
  handler: (args: string[], context: DaemonContext) => Promise<void> | void
}
