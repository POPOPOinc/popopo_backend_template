import { describe, it, expect } from '@jest/globals'
import { fisherYatesShuffle } from '../src/util'

describe('fisherYatesShuffle', () => {
  it('空配列を渡すと空配列が返る', () => {
    const result = fisherYatesShuffle([])
    expect(result).toEqual([])
  })

  it('要素が1つの場合、そのまま返る', () => {
    const result = fisherYatesShuffle([42])
    expect(result).toEqual([42])
  })

  it('配列の要素数が変わらない', () => {
    const array = [1, 2, 3, 4, 5]
    const shuffled = fisherYatesShuffle(array)
    expect(shuffled.length).toBe(array.length)
  })

  it('元の配列が変更されない', () => {
    const array = [1, 2, 3, 4, 5]
    const original = [...array]
    fisherYatesShuffle(array)
    expect(array).toEqual(original)
  })

  it('全ての要素が含まれる', () => {
    const array = [1, 2, 3, 4, 5]
    const shuffled = fisherYatesShuffle(array)
    expect(shuffled.sort()).toEqual(array.sort())
  })

  it('大きな配列でも全要素が保持される', () => {
    const array = Array.from({ length: 100 }, (_, i) => i)
    const shuffled = fisherYatesShuffle(array)
    expect(shuffled.length).toBe(100)
    expect(shuffled.sort((a, b) => a - b)).toEqual(array.sort((a, b) => a - b))
  })
})
