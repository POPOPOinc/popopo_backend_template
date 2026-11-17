declare class Phantom<T, V> {
  // eslint-disable-next-line no-unused-private-class-members
  #tag: T
  // eslint-disable-next-line no-unused-private-class-members
  #raw: V
}

/** Branded type。schema は外部配布を想定して workspace 依存を持たないため、lib-common からインライン化している */
export type Tagged<Tag, V> = Phantom<Tag, V> & V
