import { sortBy } from "../src/sort"

describe("sortBy", () => {
  test("複数のキーで順に比較する", () => {
    const people = [
      { name: "Alice", age: 30, height: 170 },
      { name: "Bob", age: 25, height: 180 },
      { name: "Charlie", age: 30, height: 160 },
    ]
    expect(people.sort(sortBy(e => [e.age, e.height])).map(e => e.name)).toEqual(["Bob", "Charlie", "Alice"])
  })

  test("単一のキーも渡せる", () => {
    expect([3, 1, 2].sort(sortBy(e => e))).toEqual([1, 2, 3])
  })
})
