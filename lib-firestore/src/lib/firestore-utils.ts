import { AggregateField, AggregateQuery, DocumentData, DocumentReference, DocumentSnapshot, Query, Transaction, UpdateData } from "firebase-admin/firestore"

export class FirestoreUtil {
  static async get<T extends DocumentData>(
    tx: Transaction | null, 
    doc: DocumentReference<T>
  ): Promise<DocumentSnapshot<T>> {
    return tx === null ? doc.get() : tx.get(doc)
  }

  static async query(
    tx: Transaction | null,
    query: Query<DocumentData, DocumentData>
  ) {
    return tx === null ? query.get() : tx.get(query)
  }

  static async count(
    tx: Transaction | null,
    query: AggregateQuery<{ count: AggregateField<number>; }, DocumentData, DocumentData>
  ) {
    return tx === null ? query.get() : tx.get(query)
  }

  static async delete(
    tx: Transaction | null,
    doc: DocumentReference
  ) {
    return tx === null ? doc.delete() : tx.delete(doc)
  }

  static update(
    tx: Transaction | null,
    doc: DocumentReference,
    updates: UpdateData<unknown>
  ) {
    return tx === null ? doc.update(updates) : tx.update(doc, updates)
  }
}
