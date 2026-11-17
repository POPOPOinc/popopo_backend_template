export default {
  meta: {
    type: "problem",
    docs: {
      description: "disallow direct access to formState properties in JSX attributes",
      category: "Best Practices",
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      formStateInJSX: "formState properties should be read before the return statement. Read '{{property}}' in the function body: const {{varName}} = form.formState.{{property}}"
    }
  },

  create(context) {
    return {
      JSXExpressionContainer(node) {
        // JSX属性内の式をチェック
        function checkNode(n) {
          if (n.type === "MemberExpression") {
            // form.formState.xxx のパターンを検出
            if (
              n.object.type === "MemberExpression" &&
              n.object.property.type === "Identifier" &&
              n.object.property.name === "formState"
            ) {
              const property = n.property.name;
              const varName = property;

              context.report({
                node: n,
                messageId: "formStateInJSX",
                data: {
                  property,
                  varName
                }
              });
            }

            // 再帰的にネストされた式をチェック
            if (n.object) {
              checkNode(n.object);
            }
            if (n.property && n.property.type !== "Identifier") {
              checkNode(n.property);
            }
          } else if (n.type === "LogicalExpression" || n.type === "BinaryExpression") {
            checkNode(n.left);
            checkNode(n.right);
          } else if (n.type === "UnaryExpression") {
            checkNode(n.argument);
          } else if (n.type === "ConditionalExpression") {
            checkNode(n.test);
            checkNode(n.consequent);
            checkNode(n.alternate);
          }
        }

        checkNode(node.expression);
      }
    };
  }
};