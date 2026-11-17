export type JobDefinition = {
  handler: (args: string[]) => Promise<void>
}
