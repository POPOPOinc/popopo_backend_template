# AGENTS.md

このリポジトリで AI エージェント（Claude Code、Devin など）が作業するときの指針です。

## コマンド

```bash
pnpm install       # 依存関係のインストール
pnpm run build     # すべてのパッケージをビルド
pnpm run check     # 型チェック
pnpm run lint      # lint（custom rule を含む）
pnpm run knip      # 使われていない export・ファイル・依存の検出（knip.json）
pnpm run test      # テスト（Firebase Emulator を使うものを含む。Java 21 以上が必要）
pnpm run test:integration  # エミュレータ上で app-server を起動して統合テストを実行（PR の CI でも 8 shard で実行）
pnpm run dev       # エミュレータ・API サーバー・管理画面をまとめて起動
```

各パッケージでも `pnpm run check` / `pnpm run lint` / `pnpm run test` が使えます。

## 構成

- `schema`: API（OpenAPI の yml → Hey API で型・SDK 関数・Request の Zod を生成）と Firestore ドキュメント（Zod）の定義、`FirestorePaths`
- `lib-common` / `lib-server` / `lib-firestore` / `lib-front` / `lib-react`: 共有ライブラリ
- `app-server`: Express の API サーバー。`api` / `job` / `daemon` の3つの起動モードを持つ
- `firebase`: `firebase.json`、Firestore / Storage の rules と indexes、rules のテスト
- `web`: Vite + React の SPA と、`web/functions` の SSR（Cloud Functions の `renderHTML`）
- `manage`: 管理画面（Vite + React）
- `document`: Firestore と API のドキュメント（Redoc）
- `migration`: Firestore のデータ投入・変更を `/migrations/{name}` で管理する仕組み
- `algolia-index`: Algolia のインデックス設定の反映
- `integration-test`: エミュレータ上で app-server を起動し、生成した型付きクライアントで叩くテスト

## アーキテクチャ

- Clean Architecture: Controller → UseCase → Access（Firestore / Algolia）の順に依存する
- `app-server/src/core.ts` の `Core` が DI コンテナ。UseCase と Access は遅延初期化のシングルトンとして持つ
- Firestore のパスは `schema` の `FirestorePaths` に集約し、文字列で直接書かない
- Firestore の読み書きは `schema` の `*Documents` の変換（Zod で検証）を通す
- API を変えるときは、先に `schema/api/*.yml` を変更して `pnpm -C schema run build` で型・SDK 関数・Zod を再生成する。Request の Zod は手で書かない。ユーザーが自由に入力する string には `format: user-free-input` を付ける
- UseCase は `SuccessOKResponse | ErrorResponse`（`interfaces/response.ts` の `Responses` で作る）を直接返し、controller はそれをそのまま返す。複数の UseCase で共有する処理は `src/service` に置き、UseCase の中で `new` する（Core には登録しない）

## コードの規約

- TypeScript は strict。`any` と non-null assertion（`!`）は使わない
- `console.log` は使わず、`lib-server` の `logger` を使う
- Promise は必ず `await` するか、`void` を付けて意図を明示する
- Firestore のクエリに対応する複合インデックスは `firebase/src/firestore.indexes.json` に追加する（lint で検査される）
- インデントは2スペース、ダブルクォート、セミコロンなし（`.editorconfig` を参照）
- 内部パッケージへの依存は `workspace:*` で書く

## 作業の完了前に

```bash
pnpm run build
pnpm run lint
pnpm run knip
pnpm run test
pnpm run test:integration
```
