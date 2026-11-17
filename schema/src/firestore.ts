
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentFieldValueLike = any

export type DocumentDataLike = {
  [field: string]: DocumentFieldValueLike
}

export type DocumentReferenceLike = {
  path: string
}

export type DocumentSnapshotLike = {
  id: string,
  data: () => DocumentDataLike | undefined,
  ref: DocumentReferenceLike,
}
