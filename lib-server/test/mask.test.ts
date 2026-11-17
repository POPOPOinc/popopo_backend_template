import { describe, it, expect } from '@jest/globals'
import { maskSensitiveData } from '../src/logger/mask'

describe('maskSensitiveData', () => {
  describe('プリミティブ値', () => {
    it('null を返す', () => {
      expect(maskSensitiveData(null)).toBeNull()
    })

    it('undefined を返す', () => {
      expect(maskSensitiveData(undefined)).toBeUndefined()
    })

    it('文字列をそのまま返す', () => {
      expect(maskSensitiveData("hello")).toBe("hello")
    })

    it('数値をそのまま返す', () => {
      expect(maskSensitiveData(42)).toBe(42)
    })

    it('boolean をそのまま返す', () => {
      expect(maskSensitiveData(true)).toBe(true)
    })
  })

  describe('ブラックリストヘッダーのマスク', () => {
    it('authorization ヘッダーをマスクする', () => {
      const input = { authorization: "Bearer token123" }
      expect(maskSensitiveData(input)).toEqual({ authorization: "[MASKED]" })
    })

    it('大文字小文字を区別しない（Authorization）', () => {
      const input = { Authorization: "Bearer token123" }
      expect(maskSensitiveData(input)).toEqual({ Authorization: "[MASKED]" })
    })

    it('x-id-token をマスクする', () => {
      const input = { "x-id-token": "id-token-value" }
      expect(maskSensitiveData(input)).toEqual({ "x-id-token": "[MASKED]" })
    })

    it('cookie をマスクする', () => {
      const input = { cookie: "session=abc123" }
      expect(maskSensitiveData(input)).toEqual({ cookie: "[MASKED]" })
    })
  })

  describe('ブラックリストパラメータのマスク', () => {
    it('password をマスクする', () => {
      const input = { password: "secret123" }
      expect(maskSensitiveData(input)).toEqual({ password: "[MASKED]" })
    })

    it('token をマスクする', () => {
      const input = { token: "abc123" }
      expect(maskSensitiveData(input)).toEqual({ token: "[MASKED]" })
    })

    it('api_key をマスクする', () => {
      const input = { api_key: "key123" }
      expect(maskSensitiveData(input)).toEqual({ api_key: "[MASKED]" })
    })

    it('private_key をマスクする', () => {
      const input = { private_key: "-----BEGIN RSA PRIVATE KEY-----" }
      expect(maskSensitiveData(input)).toEqual({ private_key: "[MASKED]" })
    })
  })

  describe('非機密データの保持', () => {
    it('ブラックリストにないキーはそのまま保持する', () => {
      const input = { name: "Alice", age: 30, email: "alice@example.com" }
      expect(maskSensitiveData(input)).toEqual({ name: "Alice", age: 30, email: "alice@example.com" })
    })

    it('機密データと非機密データが混在するオブジェクト', () => {
      const input = { name: "Alice", password: "secret123", role: "admin" }
      expect(maskSensitiveData(input)).toEqual({ name: "Alice", password: "[MASKED]", role: "admin" })
    })
  })

  describe('ネストされたオブジェクト', () => {
    it('ネストされたオブジェクト内の機密データをマスクする', () => {
      const input = {
        user: {
          name: "Alice",
          auth: {
            password: "secret123",
            token: "abc123",
          },
        },
      }
      expect(maskSensitiveData(input)).toEqual({
        user: {
          name: "Alice",
          auth: {
            password: "[MASKED]",
            token: "[MASKED]",
          },
        },
      })
    })

    it('ブラックリストに一致するキー名のオブジェクト値はそのままマスクされる', () => {
      const input = {
        user: {
          name: "Alice",
          credentials: { password: "secret123" },
        },
      }
      expect(maskSensitiveData(input)).toEqual({
        user: {
          name: "Alice",
          credentials: "[MASKED]",
        },
      })
    })

    it('深くネストされたオブジェクトを処理する', () => {
      const input = { a: { b: { c: { d: { secret: "value" } } } } }
      expect(maskSensitiveData(input)).toEqual({ a: { b: { c: { d: { secret: "[MASKED]" } } } } })
    })
  })

  describe('配列の処理', () => {
    it('配列内のオブジェクトをマスクする', () => {
      const input = [
        { name: "Alice", token: "abc" },
        { name: "Bob", token: "def" },
      ]
      expect(maskSensitiveData(input)).toEqual([
        { name: "Alice", token: "[MASKED]" },
        { name: "Bob", token: "[MASKED]" },
      ])
    })

    it('オブジェクト内の配列を処理する', () => {
      const input = {
        users: [
          { name: "Alice", password: "pass1" },
          { name: "Bob", password: "pass2" },
        ],
      }
      expect(maskSensitiveData(input)).toEqual({
        users: [
          { name: "Alice", password: "[MASKED]" },
          { name: "Bob", password: "[MASKED]" },
        ],
      })
    })
  })

  describe('循環参照の処理', () => {
    it('自己参照するオブジェクトでスタックオーバーフローしない', () => {
      const obj: Record<string, unknown> = { name: "test" }
      obj.self = obj
      const result = maskSensitiveData(obj) as Record<string, unknown>
      expect(result.name).toBe("test")
      expect(result.self).toBe("[Circular]")
    })

    it('相互参照するオブジェクトでスタックオーバーフローしない', () => {
      const a: Record<string, unknown> = { name: "a" }
      const b: Record<string, unknown> = { name: "b" }
      a.ref = b
      b.ref = a
      const result = maskSensitiveData(a) as Record<string, unknown>
      expect(result.name).toBe("a")
      const resultB = result.ref as Record<string, unknown>
      expect(resultB.name).toBe("b")
      expect(resultB.ref).toBe("[Circular]")
    })

    it('配列内の循環参照を処理する', () => {
      const obj: Record<string, unknown> = { name: "test" }
      obj.items = [obj]
      const result = maskSensitiveData(obj) as Record<string, unknown>
      expect(result.name).toBe("test")
      expect((result.items as unknown[])[0]).toBe("[Circular]")
    })

    it('深いネストの循環参照を処理する', () => {
      const obj: Record<string, unknown> = {
        level1: {
          level2: {
            level3: {},
          },
        },
      }
      const level3 = (obj.level1 as Record<string, unknown>).level2 as Record<string, unknown>
      ;(level3.level3 as Record<string, unknown>).backRef = obj
      const result = maskSensitiveData(obj) as Record<string, unknown>
      const r1 = result.level1 as Record<string, unknown>
      const r2 = r1.level2 as Record<string, unknown>
      const r3 = r2.level3 as Record<string, unknown>
      expect(r3.backRef).toBe("[Circular]")
    })

    it('循環参照を含むオブジェクトの機密データもマスクする', () => {
      const obj: Record<string, unknown> = { password: "secret", name: "test" }
      obj.self = obj
      const result = maskSensitiveData(obj) as Record<string, unknown>
      expect(result.password).toBe("[MASKED]")
      expect(result.name).toBe("test")
      expect(result.self).toBe("[Circular]")
    })
  })
})
