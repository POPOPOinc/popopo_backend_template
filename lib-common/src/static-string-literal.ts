/**
 * Rejects the wide `string` type, only accepting string literal types.
 */
type StringLiteralOnly<T extends string> =
  string extends T
    ? never
    : T;

/**
 * Rejects template literal syntax (${}) in string types.
 */
type RejectTemplateLiteral<T> =
  T extends `${infer _Start}\${${infer _Expr}}${infer _End}`
    ? never
    : T;

/**
 * Type that only accepts string literals (not the `string` type) that don't contain template literal interpolation syntax (${}).
 * ログ出力の数を計測する際、テンプレートを使用すると都度出力の形が変わって集計ができなくなるのでメッセージを固定文字列に限定する。
 */
export type StaticStringLiteral<T extends string> = StringLiteralOnly<T> & RejectTemplateLiteral<T>;
