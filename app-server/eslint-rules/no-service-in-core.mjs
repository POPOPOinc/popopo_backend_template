import path from "path"

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Prohibit importing Service classes in core.ts. Services should be instantiated inside UseCases, not registered in Core as DI singletons.",
      category: "Best Practices",
      recommended: true,
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const filename = context.getFilename()

        if (path.basename(filename) !== "core.ts") {
          return
        }

        const sourceValue = node.source.value
        if (!sourceValue || typeof sourceValue !== "string") {
          return
        }

        if (sourceValue.includes("/service/")) {
          context.report({
            node,
            message:
              "Service を Core に DI 登録しないでください。UseCase が内部で new し、FirestoreAccess 等の依存を UseCase から渡してください。これにより FirestoreAccess を mock に差し替えて UseCase の内部挙動をテストできます。UseCase → Service は外部ライブラリではなく中身を知ることが前提のため、ホワイトボックス的なテストを採用しています。",
          })
        }
      },
    }
  },
}
