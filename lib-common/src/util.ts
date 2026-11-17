export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

/**
 * 配列を指定されたサイズのチャンクに分割する
 * @param array 分割する配列
 * @param size チャンクのサイズ
 * @returns チャンクの配列
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error(`chunk size must be positive, got ${size}`)
  }
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}
