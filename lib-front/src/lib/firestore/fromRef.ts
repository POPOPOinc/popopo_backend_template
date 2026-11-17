// https://github.com/FirebaseExtended/rxfire/blob/5cfad2163ad33519f199efbf443187641a198f00/firestore/fromRef.ts

/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DocumentData, DocumentReference, DocumentSnapshot, onSnapshot, Query, QuerySnapshot, SnapshotListenOptions } from "firebase/firestore"
import { Observable } from "rxjs"

const DEFAULT_OPTIONS = { includeMetadataChanges: false }

export function fromRef<T = DocumentData>(ref: DocumentReference<T>, options?: SnapshotListenOptions): Observable<DocumentSnapshot<T>>
export function fromRef<T = DocumentData>(ref: Query<T>, options?: SnapshotListenOptions): Observable<QuerySnapshot<T>>
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Firebase Firestore reference overload requires any for generic type compatibility
export function fromRef(ref: any, options: SnapshotListenOptions = DEFAULT_OPTIONS): Observable<any> {
  return new Observable((subscriber) => {
    const unsubscribe = onSnapshot(ref, options, {
      next: subscriber.next.bind(subscriber),
      error: subscriber.error.bind(subscriber),
      complete: subscriber.complete.bind(subscriber),
    })
    return { unsubscribe }
  })
}
