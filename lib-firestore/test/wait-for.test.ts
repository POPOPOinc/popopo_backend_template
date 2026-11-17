import { Firestore, getFirestore } from "firebase-admin/firestore"
import { describe, beforeEach, it, expect, jest } from "@jest/globals"
import { waitFor, waitOpenFor } from "../src"

describe("waitFor", () => {
  let db: Firestore

  beforeEach(async () => {
    db = getFirestore()
    // テストの前にコレクションをクリーンアップ
    await db.recursiveDelete(db.collection("test-wait"))
  })

  it("ドキュメントが作成されるまで待機する", async () => {
    const collection = db.collection("test-wait")
    const query = collection.where("status", "==", "ready")

    // 非同期でドキュメントを作成
    setTimeout(async () => {
      await collection.add({ status: "ready" })
    }, 1000)

    const controller = new AbortController()
    const result = await waitFor(controller.signal, query)

    expect(result.docs.length).toBeGreaterThan(0)
    expect(result.docs[0].data()).toEqual({ status: "ready" })
  })

  it("シグナルがabortされたら待機を中断する", async () => {
    const collection = db.collection("test-wait")
    const query = collection.where("status", "==", "ready")

    const controller = new AbortController()
    const abortError = new Error("Manually aborted")

    // 500ms後にabort
    setTimeout(() => {
      controller.abort(abortError)
    }, 500)

    await expect(waitFor(controller.signal, query))
      .rejects
      .toBe(abortError)
  })
})

describe("waitOpenFor", () => {
  let db: Firestore

  beforeEach(async () => {
    db = getFirestore()
    await db.recursiveDelete(db.collection("test-wait"))
  })

  it("時刻が現在時刻を過ぎるまで待機する", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    const waitTime = 1000 // 1秒待機
    const targetTime = now + waitTime

    await collection.add({ time: targetTime })

    const controller = new AbortController()
    const startTime = performance.now()
    const result = await waitOpenFor(controller.signal, collection, "time")
    const elapsedTime = performance.now() - startTime

    expect(result.docs.length).toBeGreaterThan(0)
    expect(result.docs[0].get("time")).toBe(targetTime)
    // ほぼwaitTime分待機していることを確認（誤差を考慮して少し余裕を持たせる）
    expect(elapsedTime).toBeGreaterThanOrEqual(waitTime - 50)
    expect(elapsedTime).toBeLessThan(waitTime * 1.5)
  })

  it("指定時間分古いドキュメントを待機する (elapsedMsの利用)", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    const targetTime = now - 6 * 60 * 1000 // 6分前（5分より古い）
    
    await collection.add({ lastUpdate: targetTime })

    const controller = new AbortController()
    // すでに5分以上経過しているので、即座に返ってくるはず
    const startTime = performance.now()
    const result = await waitOpenFor(
      controller.signal,
      collection,
      "lastUpdate",
      { elapsedMs: 5 * 60 * 1000 } // 5分経過
    )
    const elapsedTime = performance.now() - startTime

    expect(result.docs.length).toBeGreaterThan(0)
    expect(result.docs[0].get("lastUpdate")).toBe(targetTime)
    // 即座に返ってくることを確認（CI環境の揺らぎを考慮して200ms以内）
    expect(elapsedTime).toBeLessThan(200)
  })

  it("elapsedMsは過去の時間を指定する（現在時刻 - elapsedMs)", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    
    // 以下のドキュメントを作成:
    // - 40秒前のドキュメント（30秒より古い → 対象）
    // - 20秒前のドキュメント（30秒より新しい → 対象外）
    // - 10秒後のドキュメント（未来 → 対象外）
    const veryOldTime = now - 40 * 1000  // 40秒前
    const recentTime = now - 20 * 1000   // 20秒前  
    const futureTime = now + 10 * 1000   // 10秒後
    
    await collection.add({ last_connected_at: veryOldTime })
    await collection.add({ last_connected_at: recentTime })
    await collection.add({ last_connected_at: futureTime })

    const controller = new AbortController()
    const startTime = performance.now()
    
    // elapsedMs: 30秒 = 30秒以上前のドキュメントを対象とする
    const result = await waitOpenFor(
      controller.signal,
      collection,
      "last_connected_at", 
      { elapsedMs: 30 * 1000 }
    )
    const elapsedTime = performance.now() - startTime

    // 40秒前のドキュメントのみが返されるべき
    expect(result.docs.length).toBe(1)
    expect(result.docs[0].get("last_connected_at")).toBe(veryOldTime)
    
    // 即座に返される（CI環境の揺らぎを考慮して200ms以内）
    expect(elapsedTime).toBeLessThan(200)
  })

  it("elapsedMsで条件を満たすドキュメントがない場合は最も古いドキュメントの時刻まで待機", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    
    // すべて30秒より新しいドキュメント
    const time1 = now - 10 * 1000  // 10秒前
    const time2 = now - 5 * 1000   // 5秒前
    const time3 = now + 3 * 1000   // 3秒後
    
    await collection.add({ last_connected_at: time1 })
    await collection.add({ last_connected_at: time2 })
    await collection.add({ last_connected_at: time3 })

    const controller = new AbortController()
    const startTime = performance.now()
    
    // elapsedMs: 30秒 = 30秒以上前のドキュメントを待機
    // 条件を満たすものがないので、最も古い時刻 + 30秒まで待機
    const result = await waitOpenFor(
      controller.signal,
      collection,
      "last_connected_at",
      { elapsedMs: 30 * 1000 }
    )
    const elapsedTime = performance.now() - startTime

    // 最も古いドキュメント（10秒前）が30秒経過する時刻まで約20秒待機
    // 待機後に最も古いドキュメントが返されるはず
    expect(result.docs.length).toBe(1)
    expect(result.docs[0].get("last_connected_at")).toBe(time1)
    
    // 約20秒待機していることを確認（18-22秒の範囲）
    expect(elapsedTime).toBeGreaterThan(18000)
    expect(elapsedTime).toBeLessThan(22000)
  }, 25000)

  it("シグナルがabortされたら待機を中断する", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()

    await collection.add({ time: now + 5000 }) // 5秒後

    const controller = new AbortController()
    const abortError = new Error("Manually aborted")

    setTimeout(() => {
      controller.abort(abortError)
    }, 500)

    await expect(waitOpenFor(controller.signal, collection, "time"))
      .rejects
      .toBe(abortError)
  })

  it("現在時刻を過ぎているドキュメントを複数件一度に返す", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    
    // A/B/C/Dドキュメント例を作成
    const docA = { next_change_at: now - 30 * 60 * 1000 } // 30分前
    const docB = { next_change_at: now - 15 * 60 * 1000 } // 15分前  
    const docC = { next_change_at: now - 10 * 60 * 1000 } // 10分前
    const docD = { next_change_at: now + 30 * 60 * 1000 } // 30分後

    await collection.add(docA)
    await collection.add(docB)
    await collection.add(docC)
    await collection.add(docD)

    const controller = new AbortController()
    const result = await waitOpenFor(controller.signal, collection, "next_change_at")

    // A、B、Cが返されることを期待（Dは未来なので除外）
    expect(result.docs.length).toBe(3)
    
    // 時刻順にソートされていることを確認
    const times = result.docs.map(doc => doc.get("next_change_at"))
    expect(times).toEqual([
      docA.next_change_at,
      docB.next_change_at, 
      docC.next_change_at
    ])
    
    // 全て現在時刻より過去であることを確認
    for (const time of times) {
      expect(time).toBeLessThan(now)
    }
  })

  it("未来のドキュメントでは最も早い時刻のドキュメント1件のみが返される", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    
    // A/B/Cドキュメント例を作成（全て未来）
    const docA = { next_change_at: now + 5 * 1000 }       // 5秒後
    const docB = { next_change_at: now + 5 * 60 * 1000 }  // 5分後  
    const docC = { next_change_at: now + 10 * 60 * 1000 } // 10分後

    await collection.add(docA)
    await collection.add(docB)
    await collection.add(docC)

    const controller = new AbortController()
    const startTime = performance.now()
    const result = await waitOpenFor(controller.signal, collection, "next_change_at")
    const elapsedTime = performance.now() - startTime

    // 最も早いドキュメントA（1件のみ）が返されることを期待
    expect(result.docs.length).toBe(1)
    expect(result.docs[0].get("next_change_at")).toBe(docA.next_change_at)
    
    // 約5秒間待機していることを確認（誤差を考慮）
    expect(elapsedTime).toBeGreaterThanOrEqual(4500)  // 4.5秒以上
    expect(elapsedTime).toBeLessThan(6000)            // 6秒未満
  }, 10000) // 10秒のタイムアウト

  it("limitオプションで取得件数を制限できる", async () => {
    const collection = db.collection("test-wait")
    const now = Date.now()
    
    // 5件の過去ドキュメントを作成
    for (let i = 0; i < 5; i++) {
      await collection.add({ next_change_at: now - (i + 1) * 1000 })
    }

    const controller = new AbortController()
    
    // limit: 3 で制限
    const result = await waitOpenFor(controller.signal, collection, "next_change_at", { limit: 3 })
    
    // 3件まで制限されていることを確認
    expect(result.docs.length).toBe(3)
  })

  describe("setTimeout オーバーフロー対策のテスト", () => {
    it("32bit signed int を超える待機時間の場合、setTimeout をスキップする", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      const MAX_INT32 = 2147483647
      const veryLongTime = now + MAX_INT32 + 10000 // 最大値 + 10秒
      
      await collection.add({ scheduled_at: veryLongTime })
      
      const controller = new AbortController()
      
      setTimeout(() => {
        controller.abort(new Error("Test timeout"))
      }, 100)
      
      await expect(waitOpenFor(controller.signal, collection, "scheduled_at"))
        .rejects
        .toThrow("Test timeout")
    })

    it("32bit signed int の境界値（2147483647ms）では正常に setTimeout が動作する", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      const MAX_INT32 = 2147483647
      const boundaryTime = now + MAX_INT32
      
      await collection.add({ scheduled_at: boundaryTime })
      
      const controller = new AbortController()
      
      setTimeout(() => {
        controller.abort(new Error("Test timeout"))
      }, 100)
      
      await expect(waitOpenFor(controller.signal, collection, "scheduled_at"))
        .rejects
        .toThrow("Test timeout")
    })
  })

  describe("イベントリスナーの解放漏れテスト", () => {
    it("早期リターン時にabortイベントリスナーが追加されないことを確認", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      await collection.add({ scheduled_at: now - 1000 }) // 1秒前
      
      const controller = new AbortController()
      
      const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener')
      
      const result = await waitOpenFor(controller.signal, collection, "scheduled_at")
      
      expect(result.docs.length).toBe(1)
      expect(result.docs[0].get("scheduled_at")).toBe(now - 1000)
      
      expect(addEventListenerSpy).not.toHaveBeenCalled()
      
      expect(removeEventListenerSpy).not.toHaveBeenCalled()
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it("待機が必要な場合はabortイベントリスナーが適切に追加・削除されることを確認", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      await collection.add({ scheduled_at: now + 1000 }) // 1秒後
      
      const controller = new AbortController()
      
      const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener')
      
      const startTime = performance.now()
      const result = await waitOpenFor(controller.signal, collection, "scheduled_at")
      const elapsedTime = performance.now() - startTime
      
      expect(result.docs.length).toBe(1)
      expect(result.docs[0].get("scheduled_at")).toBe(now + 1000)
      
      expect(elapsedTime).toBeGreaterThanOrEqual(900)
      expect(elapsedTime).toBeLessThan(1500)
      
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
      expect(addEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function), { once: true })
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
      expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function))
      
      // 同じ関数が追加・削除されていることを確認
      const addedFunction = addEventListenerSpy.mock.calls[0][1]
      const removedFunction = removeEventListenerSpy.mock.calls[0][1]
      expect(addedFunction).toBe(removedFunction)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    }, 5000)

    it("abort時にイベントリスナーが適切に削除されることを確認", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      await collection.add({ scheduled_at: now + 5000 }) // 5秒後
      
      const controller = new AbortController()
      const abortError = new Error("Test abort")
      
      const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener')
      
      // 500ms後にabort
      setTimeout(() => {
        controller.abort(abortError)
      }, 500)
      
      await expect(waitOpenFor(controller.signal, collection, "scheduled_at"))
        .rejects
        .toBe(abortError)
      
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
      expect(addEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function), { once: true })
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
      expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function))
      
      // 同じ関数が追加・削除されていることを確認
      const addedFunction = addEventListenerSpy.mock.calls[0][1]
      const removedFunction = removeEventListenerSpy.mock.calls[0][1]
      expect(addedFunction).toBe(removedFunction)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it("elapsedMsオプション使用時の早期リターンでもイベントリスナーが追加されないことを確認", async () => {
      const collection = db.collection("test-wait")
      const now = Date.now()
      
      await collection.add({ last_update: now - 5 * 60 * 1000 }) // 5分前
      
      const controller = new AbortController()
      
      const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener')
      
      const result = await waitOpenFor(
        controller.signal, 
        collection, 
        "last_update", 
        { elapsedMs: 3 * 60 * 1000 } // 3分経過
      )
      
      expect(result.docs.length).toBe(1)
      expect(result.docs[0].get("last_update")).toBe(now - 5 * 60 * 1000)
      
      expect(addEventListenerSpy).not.toHaveBeenCalled()
      
      expect(removeEventListenerSpy).not.toHaveBeenCalled()
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

})

describe("waitOpenFor の abort", () => {
  it("最初の get() を待っている間に abort されても、待機を中断する", async () => {
    const query = getFirestore().collection("test-wait-abort")
    const controller = new AbortController()
    const abortError = new Error("Manually aborted")

    // 呼び出し直後（最初の get() の応答を待っている間）に abort する
    const promise = waitOpenFor(controller.signal, query, "time")
    controller.abort(abortError)

    await expect(promise).rejects.toBe(abortError)
  }, 10000)
})
