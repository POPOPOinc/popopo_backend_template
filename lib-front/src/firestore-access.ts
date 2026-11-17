import * as Rx from "rxjs"
import * as FS from "firebase/firestore"
import { useEffect, useMemo, useState } from "react"
import { nonNullable } from "lib-common"
import {
  AdminDocument,
  AdminOperationDocument,
  AdminOperationDocuments,
  AdminDocuments,
  AdminId,
  DocumentSnapshotLike,
  FirestorePaths,
  Loading,
  LoadingOption,
  PostDocument,
  PostDocuments,
  PostId,
  UserDocument,
  UserDocuments,
  UserId,
  UserPreferencesDocumentBody,
  UserPreferencesDocuments,
} from "schema"
import { useObservable } from "rxjs-hooks"
import { fromRef } from "./lib/firestore/fromRef"

export type PagePosition = {
  start?: string
  until?: string
  pageSize: number
}

export type PageResult<T> = {
  docs: T[]
  next?: string
  prev?: string
}

/** クライアント SDK から Firestore を直接読むためのアクセサ。読み取り権限は firebase/src/firestore.rules で制御する */
export class FirestoreAccess {

  private readonly _firestore: FS.Firestore

  constructor(firestore: FS.Firestore) {
    this._firestore = firestore
  }

  static handleAuthorityError<T>(e: Error, path: string, value: T): Promise<T> {
    if (e.name === "FirebaseError" && e.message.indexOf("evaluation error") !== -1) {
      console.warn(path, e)
      return Promise.resolve(value)
    }
    console.error(path, e, value)
    throw e
  }

  static handleAuthorityErrorAsNull(e: Error, path: string): Promise<null> {
    return FirestoreAccess.handleAuthorityError(e, path, null)
  }

  static handleAuthorityErrorAsEmpty(e: Error, path: string): Promise<[]> {
    return FirestoreAccess.handleAuthorityError(e, path, [])
  }

  async getAdmin(adminId: AdminId): Promise<AdminDocument | null> {
    const document = await FS.getDoc(FS.doc(this._firestore, FirestorePaths.Admins.getDocPath(adminId)))
    return AdminDocuments.fromDocumentSnapshot(document)
  }

  async getUser(userId: UserId): Promise<UserDocument | null> {
    const document = await FS.getDoc(FS.doc(this._firestore, FirestorePaths.Users.getDocPath(userId)))
    return UserDocuments.fromDocumentSnapshot(document)
  }

  async getUserPreferences(userId: UserId): Promise<UserPreferencesDocumentBody | null> {
    const document = await FS.getDoc(FS.doc(this._firestore, FirestorePaths.Users.Preferences.getDocPath(userId)))
    return UserPreferencesDocuments.fromDocumentSnapshot(document)
  }

  /** 本人の設定をクライアントから直接書き込む。書けるフィールドは firestore.rules で制限している */
  async setUserPreferences(userId: UserId, preferences: Omit<UserPreferencesDocumentBody, "updated_at">, now: number = Date.now()): Promise<void> {
    const data: UserPreferencesDocumentBody = {
      notification_enabled: preferences.notification_enabled,
      updated_at: now,
    }
    await FS.setDoc(FS.doc(this._firestore, FirestorePaths.Users.Preferences.getDocPath(userId)), data)
  }

  async getPost(postId: PostId): Promise<PostDocument | null> {
    const document = await FS.getDoc(FS.doc(this._firestore, FirestorePaths.Posts.getDocPath(postId)))
    return PostDocuments.fromDocumentSnapshot(document)
  }

  async getPostsByUser(userId: UserId, limit: number): Promise<PostDocument[]> {
    const snapshot = await FS.getDocs(FS.query(
      FS.collection(this._firestore, FirestorePaths.Posts.path),
      FS.where("user_id", "==", userId),
      FS.orderBy("created_at", "desc"),
      FS.limit(limit),
    ))
    return snapshot.docs.map(PostDocuments.fromDocumentSnapshot).filter(nonNullable)
  }

}

export function useAdmin(firestore: FS.Firestore, adminId: LoadingOption<AdminId>): LoadingOption<AdminDocument> {
  return useDocument(firestore, FirestorePaths.Admins.path, adminId, AdminDocuments.fromDocumentSnapshot)
}

export function useUser(firestore: FS.Firestore, userId: LoadingOption<UserId>): LoadingOption<UserDocument> {
  return useDocument(firestore, FirestorePaths.Users.path, userId, UserDocuments.fromDocumentSnapshot)
}

export function useCountUsers(firestore: FS.Firestore): Loading<number> {
  return useTotalCount(firestore, FirestorePaths.Users.path)
}

export function useUsersPage(firestore: FS.Firestore, pagePosition: PagePosition): Loading<PageResult<UserDocument>> {
  return useCollectionPage(firestore, FirestorePaths.Users.path, UserDocuments.fromDocumentSnapshot, pagePosition)
}

export function usePosts(firestore: FS.Firestore, limit: number): Loading<PostDocument[]> {
  // rules で読めるのは公開済みの投稿（と自分の投稿）なので、公開済みに絞って読む
  return useCollection(firestore, FirestorePaths.Posts.path, PostDocuments.fromDocumentSnapshot, limit, [FS.where("display_period_state.active", "==", true), FS.orderBy("created_at", "desc")])
}

export function useCountPosts(firestore: FS.Firestore): Loading<number> {
  return useTotalCount(firestore, FirestorePaths.Posts.path)
}

export function usePostsPage(firestore: FS.Firestore, pagePosition: PagePosition): Loading<PageResult<PostDocument>> {
  return useCollectionPage(firestore, FirestorePaths.Posts.path, PostDocuments.fromDocumentSnapshot, pagePosition)
}

/** ほかのユーザーの投稿一覧。rules で読める表示期間内（display_period_state.active == true）の投稿だけを問い合わせる */
export function usePublicPostsByUser(firestore: FS.Firestore, userId: UserId, limit: number): Loading<PostDocument[]> {
  return useCollection(firestore, FirestorePaths.Posts.path, PostDocuments.fromDocumentSnapshot, limit, [
    FS.where("user_id", "==", userId),
    FS.where("display_period_state.active", "==", true),
    FS.orderBy("created_at", "desc"),
  ])
}

/** 表示期間外も含むユーザーの投稿一覧。rules で読めるのは、投稿者本人と管理者（manage）だけ */
export function useAllPostsByUser(firestore: FS.Firestore, userId: UserId, limit: number): Loading<PostDocument[]> {
  return useCollection(firestore, FirestorePaths.Posts.path, PostDocuments.fromDocumentSnapshot, limit, [FS.where("user_id", "==", userId), FS.orderBy("created_at", "desc")])
}

export function useAdminOperationsPage(firestore: FS.Firestore, pagePosition: PagePosition): Loading<PageResult<AdminOperationDocument>> {
  return useCollectionPage(firestore, FirestorePaths.AdminOperations.path, AdminOperationDocuments.fromDocumentSnapshot, pagePosition)
}

function useDocument<T>(firestore: FS.Firestore, path: string, id: LoadingOption<string>, converter: (doc: DocumentSnapshotLike | null) => T | null): LoadingOption<T> {
  const [document, setDocument] = useState<LoadingOption<DocumentSnapshotLike>>("loading")

  useEffect(() => {
    if (id === "loading" || id === "" || path.indexOf("//") !== -1) {
      // 購読対象が変わったときに前の値を表示しないよう、購読の前に状態を戻す
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocument("loading")
      return
    }
    if (id === null) {
      setDocument(null)
      return
    }

    const ref = FS.doc(firestore, path + "/" + id)

    const subscription = fromRef(ref, { includeMetadataChanges: true })
      .pipe(
        Rx.catchError((e) => FirestoreAccess.handleAuthorityErrorAsNull(e, path + "/" + id)),
        Rx.map((doc) => setDocument(doc)),
      )
      .subscribe()

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, id])

  return document === "loading" ? "loading" : converter(document)
}

function useCollection<T>(
  firestore: FS.Firestore,
  path: string,
  converter: (doc: DocumentSnapshotLike) => T | null,
  limit: number | undefined = undefined,
  queries: FS.QueryConstraint[] = [],
): Loading<T[]> {
  const query = FS.query(FS.collection(firestore, path), ...queries.concat(limit ? [FS.limit(limit)] : []))

  return useObservable<Loading<T[]>>(
    () =>
      fromRef(query, { includeMetadataChanges: true }).pipe(
        Rx.map((e) => e.docs),
        Rx.catchError((e) => FirestoreAccess.handleAuthorityErrorAsEmpty(e, path)),
        Rx.map((docs) => {
          return docs.map(converter).filter(nonNullable)
        }),
      ),
    "loading" as const,
  )
}

function useTotalCount(firestore: FS.Firestore, path: string): Loading<number> {
  const [result, setResult] = useState<Loading<number>>("loading")
  useEffect(() => {
    void (async () => {
      const snapshot = await FS.getCountFromServer(FS.query(FS.collection(firestore, path)))
      setResult(snapshot.data().count)
    })()
  }, [firestore, path])
  return result
}

function useCollectionPage<T>(
  firestore: FS.Firestore,
  path: string,
  converter: (doc: DocumentSnapshotLike) => T | null,
  pagePosition: PagePosition,
  options: {
    ordering: {
      field: string,
      direction: "asc" | "desc"
    }
  } = {
    ordering: {
      field: "created_at",
      direction: "desc",
    },
  },
): Loading<PageResult<T>> {
  const colRef = FS.collection(firestore, path)
  const [result, setResult] = useState<Loading<PageResult<T>>>("loading")
  const [pivot, setPivot] = useState<LoadingOption<FS.DocumentSnapshot>>("loading")

  useEffect(() => {
    let cancelled = false
    const id = pagePosition.start ?? pagePosition.until
    if (id == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPivot(null)
    } else {
      void (async () => {
        const pivotDoc = await FS.getDoc(FS.doc(firestore, path + "/" + id))
        if (!cancelled) {
          // pivot doc が存在しない場合は初回ページ表示と同等の振る舞いとする
          setPivot(pivotDoc.exists() ? pivotDoc : null)
        }
      })()
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, pagePosition.start, pagePosition.until, pagePosition.pageSize])

  const pagedQuery = useMemo(() => {
    if (pivot === "loading") {
      return undefined
    }
    return FS.query(
      colRef,
      FS.orderBy(options.ordering.field, options.ordering.direction),
      ...(pivot
        ? pagePosition.until
          ? [FS.endBefore(pivot), FS.limitToLast(pagePosition.pageSize + 1)]
          : [FS.startAt(pivot), FS.limit(pagePosition.pageSize + 1)]
        : [FS.limit(pagePosition.pageSize + 1)]),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, pivot, pagePosition.pageSize, pagePosition.until, pagePosition.start])

  useEffect(() => {
    void (async () => {
      if (pagedQuery == null) {
        return
      }
      const { docs } = await FS.getDocs(pagedQuery)

      if (pivot && pagePosition.until) {
        setResult({
          docs: docs.slice(-pagePosition.pageSize).map(converter).filter(nonNullable),
          next: pagePosition.until,
          prev: docs.length === pagePosition.pageSize + 1 ? docs[1]?.id : undefined,
        })
      } else {
        setResult({
          docs: docs.slice(0, pagePosition.pageSize).map(converter).filter(nonNullable),
          next: docs.length === pagePosition.pageSize + 1 ? docs[docs.length - 1]?.id : undefined,
          prev: pagePosition.start,
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pivot, pagedQuery])

  return result
}
