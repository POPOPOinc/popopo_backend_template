import { randomInt } from "crypto"

/**
 * Fisher-Yatesアルゴリズムによる配列のシャッフル（元の配列は変更しない）
 * @param array シャッフルする配列
 * @returns シャッフルされた新しい配列
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; 0 < i; i--) {
    const j = randomInt(i + 1)
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}
