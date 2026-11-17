type Comparable = string | number | boolean

/**
 * ```
 * [
 *  { name: 'Alice', age: 30, height: 170 },
 *  { name: 'Bob', age: 25, height: 180 },
 *  { name: 'Charlie', age: 35, height: 175 }
 * ].sortBy(e => [e.age, e.height])
 * ```
 */
export function sortBy<T>(
  f: (e: T) => Comparable[] | Comparable
): (a: T, b: T) => number {

  return (a, b) => {
    const _aValues = f(a)
    const _bValues = f(b)
    const aValues = Array.isArray(_aValues) ? _aValues : [_aValues]
    const bValues = Array.isArray(_bValues) ? _bValues : [_bValues]
    
    for (let i = 0; i < Math.min(aValues.length, bValues.length); i++) {
      const aValue = aValues[i]
      const bValue = bValues[i]
      if (aValue < bValue) {
        return -1
      } else if (bValue < aValue) {
        return 1
      }
    }
    return 0
  }
}
