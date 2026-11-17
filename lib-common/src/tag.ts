declare class Phantom<T, V> {
  // eslint-disable-next-line no-unused-private-class-members
  #tag: T
  // eslint-disable-next-line no-unused-private-class-members
  #raw: V
}

export type Tagged<Tag, V> = Phantom<Tag, V> & V
