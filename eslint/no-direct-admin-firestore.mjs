export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct admin.firestore() usage in test files. Use FirebaseAdminUser helper methods instead.",
      category: "Best Practices",
      recommended: true
    },
    schema: [],
    messages: {
      noDirectAdminFirestore: "テストファイルで admin.firestore() を直接使用しないでください。FirebaseAdminUser のヘルパーメソッドを使用してください。"
    },
    fixable: null
  },

  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "admin" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "firestore"
        ) {
          context.report({
            node,
            messageId: "noDirectAdminFirestore"
          })
        }
      }
    }
  }
}
