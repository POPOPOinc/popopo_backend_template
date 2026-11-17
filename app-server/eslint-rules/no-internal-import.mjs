import path from 'path';

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Prohibit importing from internal/ directories outside of their parent directory",
      category: "Best Practices",
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const sourceValue = node.source.value;
        if (!sourceValue || typeof sourceValue !== 'string') {
          return;
        }

        // internal/ を含む相対 import のみチェック
        if (!sourceValue.startsWith('.') || !sourceValue.includes('/internal/')) {
          return;
        }

        const filename = context.getFilename();
        const fileDir = path.dirname(filename);

        // import 先の絶対パスを解決
        const importedPath = path.resolve(fileDir, sourceValue);

        // import 先パス内の internal/ の位置を見つける
        const internalIndex = importedPath.lastIndexOf(path.sep + 'internal' + path.sep);
        if (internalIndex === -1) {
          return;
        }

        // internal/ の親ディレクトリ
        const internalParentDir = importedPath.substring(0, internalIndex);

        // import 元のファイルが internal/ の親ディレクトリ直下にあるかチェック
        if (fileDir !== internalParentDir) {
          context.report({
            node,
            message: `internal/ ディレクトリのモジュールは、その親ディレクトリからのみ import できます。このファイルから ${sourceValue} を import することはできません。`
          });
        }
      }
    };
  }
};
