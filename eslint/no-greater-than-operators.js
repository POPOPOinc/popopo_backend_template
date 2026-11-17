export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow greater-than comparison operators in favor of less-than operators",
      category: "Stylistic Issues",
      recommended: false
    },
    fixable: "code",
    schema: []
  },

  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator === ">" || node.operator === ">=") {
          const sourceCode = context.getSourceCode();
          const leftText = sourceCode.getText(node.left);
          const rightText = sourceCode.getText(node.right);
          const newOperator = node.operator === ">" ? "<" : "<=";
          
          context.report({
            node,
            message: `Use "${newOperator}" instead of "${node.operator}" by swapping operands`,
            fix(fixer) {
              return fixer.replaceText(node, `${rightText} ${newOperator} ${leftText}`);
            }
          });
        }
      }
    };
  }
};
