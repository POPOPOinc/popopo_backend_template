import { FieldPath, Transaction } from "firebase-admin/firestore"
import { CollectionGroup, CollectionReference, DocumentSnapshot, Query } from "firebase-admin/firestore"

export type WalkRequest<Cursor = DocumentSnapshot> = {
  limit: number
  cursor?: Cursor
}

export type WalkResponse<Item, Cursor = DocumentSnapshot> = {
  items: Item[]
  nextCursor?: Cursor
}

export async function walkCollection<Item>(
  tx: Transaction | null,
  collection: CollectionReference,
  { limit, cursor }: WalkRequest<string>,
  snapshotToItem: (doc: DocumentSnapshot) => Item | null
): Promise<WalkResponse<Item, string>> {
  const q = collection.orderBy(FieldPath.documentId())
  return await walk(tx, q, { limit, cursor }, snapshotToItem, (e) => e.ref.id)
}

export async function walkCollectionGroup<Item>(
  tx: Transaction,
  collectionGroup: CollectionGroup,
  { limit, cursor }: WalkRequest<string>,
  snapshotToItem: (doc: DocumentSnapshot) => Item | null
): Promise<WalkResponse<Item, string>> {
  const q = collectionGroup.orderBy(FieldPath.documentId())
  return await walk(tx, q, { limit, cursor }, snapshotToItem, (e) => e.ref.path)
}

export async function walk<Item, Cursor>(
  tx: Transaction | null,
  query: Query,
  { limit, cursor }: WalkRequest<Cursor>,
  snapshotToItem: (doc: DocumentSnapshot) => Item | null,
  snapshotToCursor: (doc: DocumentSnapshot) => Cursor
): Promise<WalkResponse<Item, Cursor>> {
  const q = query.limit(limit + 1)
  const x = await (tx === null ? (cursor == null ? q : q.startAt(cursor)).get() : tx.get(
    cursor == null ? q : q.startAt(cursor)
  ))
  return {
    nextCursor: x.docs[limit] == null ? undefined : snapshotToCursor(x.docs[limit]),
    items: x.docs.slice(0, limit).map(snapshotToItem).filter((e) => e != null)
  }
}
