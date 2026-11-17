export async function sleepMs(duration: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, duration))
}
