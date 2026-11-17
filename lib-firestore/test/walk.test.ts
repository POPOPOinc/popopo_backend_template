import { Firestore, getFirestore } from "firebase-admin/firestore"
import { describe, beforeEach, it, expect } from "@jest/globals"
import { walk, walkCollection, walkCollectionGroup } from "../src"
import { DocumentSnapshot } from "firebase-admin/firestore"

describe("walkCollection", () => {
  let db: Firestore;

  beforeEach(async () => {
    db = getFirestore();
    // テストの前にコレクションをクリーンアップ
    await db.recursiveDelete(db.collection("test-walk"));
    // usersコレクション配下もクリーンアップ
    await db.recursiveDelete(db.collection("users"));
  });

  describe("walkCollection", () => {
    it("ドキュメントをページネーションで取得する", async () => {
      const collection = db.collection("test-walk");

      // テストデータの作成（順序が保証されるように）
      await collection.doc("a").set({ value: "A" });
      await collection.doc("b").set({ value: "B" });
      await collection.doc("c").set({ value: "C" });

      // 1ページ目を取得
      const result1 = await db.runTransaction(async (tx) => {
        return walkCollection(
          tx,
          collection,
          { limit: 2 },
          (doc: DocumentSnapshot) => doc.data()?.value
        );
      });

      expect(result1.items).toEqual(["A", "B"]);
      expect(result1.nextCursor).toBeDefined();

      // 2ページ目を取得
      const result2 = await db.runTransaction(async (tx) => {
        return walkCollection(
          tx,
          collection,
          { limit: 2, cursor: result1.nextCursor },
          (doc: DocumentSnapshot) => doc.data()?.value
        );
      });

      expect(result2.items).toEqual(["C"]);
      expect(result2.nextCursor).toBeUndefined();
    });
  });

  describe("walkCollectionGroup", () => {
    it("コレクショングループをページネーションで取得する", async () => {
      const collections = [
        db.collection("users").doc("u1").collection("test-walk"),
        db.collection("users").doc("u2").collection("test-walk")
      ];

      // テストデータの作成（順序は自動的にパスでソートされる）
      await collections[0].doc("a").set({ value: "A1" });
      await collections[0].doc("b").set({ value: "B1" });
      await collections[1].doc("a").set({ value: "A2" });
      await collections[1].doc("b").set({ value: "B2" });

      // 1ページ目を取得
      const result1 = await db.runTransaction(async (tx) => {
        return walkCollectionGroup(
          tx,
          db.collectionGroup("test-walk"),
          { limit: 3 },
          (doc: DocumentSnapshot) => doc.data()?.value
        );
      });

      // パスでソートされるため、u1のドキュメントが先に来る
      expect(result1.items).toEqual(["A1", "B1", "A2"]);
      expect(result1.nextCursor).toBeDefined();

      // 2ページ目を取得
      const result2 = await db.runTransaction(async (tx) => {
        return walkCollectionGroup(
          tx,
          db.collectionGroup("test-walk"),
          { limit: 3, cursor: result1.nextCursor },
          (doc: DocumentSnapshot) => doc.data()?.value
        );
      });

      expect(result2.items).toEqual(["B2"]);
      expect(result2.nextCursor).toBeUndefined();
    });
  });

  describe("walk", () => {
    it("クエリをページネーションで取得する", async () => {
      const collection = db.collection("test-walk");

      // テストデータの作成
      await collection.doc("a").set({ value: "A", score: 80 });  // score順で3番目
      await collection.doc("b").set({ value: "B", score: 100 }); // score順で1番目
      await collection.doc("c").set({ value: "C", score: 90 });  // score順で2番目

      // scoreでソートしたクエリ
      const query = collection.orderBy("score", "desc");

      // 1ページ目を取得
      const result1 = await db.runTransaction(async (tx) => {
        return walk(
          tx,
          query,
          { limit: 2 },
          (doc) => doc.data()?.value,
          (doc) => doc
        );
      });

      // スコアが高い順（B, C）が取得される
      expect(result1.items).toEqual(["B", "C"]);
      expect(result1.nextCursor).toBeDefined();

      // 2ページ目を取得
      const result2 = await db.runTransaction(async (tx) => {
        return walk(
          tx,
          query,
          { limit: 2, cursor: result1.nextCursor },
          (doc) => doc.data()?.value,
          (doc) => doc
        );
      });

      // 残りのドキュメント（A）が取得される
      expect(result2.items).toEqual(["A"]);
      expect(result2.nextCursor).toBeUndefined();
    });
  });
});
