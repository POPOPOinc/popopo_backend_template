export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow bracket notation with identifier-like string keys to prevent bypassing private/protected access",
      category: "Best Practices",
      recommended: true
    },
    schema: [{
      type: "object",
      properties: {
        allow: {
          type: "array",
          items: { type: "string" }
        }
      },
      additionalProperties: false
    }],
    messages: {
      avoid: 'ブラケット記法による文字列リテラル "{{name}}" でのプロパティアクセスは禁止されています。ドット記法を使用してください。このパターンは private/protected アクセス制御を回避する可能性があります。'
    },
    fixable: null
  },

  create(context) {
    const opts = context.options?.[0] || {}
    const allow = new Set(opts.allow || [])
    
    const isIdentifier = (s) => /^[$A-Z_a-z][$\w]*$/.test(s)
    
    const getLiteralName = (propertyNode) => {
      if (propertyNode.type === "Literal" && typeof propertyNode.value === "string") {
        return propertyNode.value
      }
      if (propertyNode.type === "TemplateLiteral" && 
          propertyNode.expressions.length === 0 && 
          propertyNode.quasis.length === 1) {
        return propertyNode.quasis[0].value.cooked ?? ""
      }
      return null
    }

    return {
      MemberExpression(node) {
        if (!node.computed) {
          return
        }

        const name = getLiteralName(node.property)
        
        if (name == null) {
          return
        }

        if (!isIdentifier(name)) {
          return
        }

        if (allow.has(name)) {
          return
        }

        context.report({
          node,
          messageId: "avoid",
          data: { name }
        })
      }
    }
  }
}
