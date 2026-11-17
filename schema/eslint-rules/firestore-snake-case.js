import {normalize, sep} from 'path';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce snake_case naming for Firestore document properties',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [],
    messages: {
      notSnakeCase: 'Firestore property "{{name}}" should be in snake_case format.',
    },
  },

  create(context) {
    function isSnakeCase(name) {
      return /^[a-z][a-z0-9_]*$/.test(name);
    }

    function isFirestoreFile() {
      const filename = context.getFilename();
      const normalizedPath = normalize(filename);
      return normalizedPath.includes(`${sep}firestore${sep}`) && filename.endsWith('.ts');
    }

    function checkObjectProperties(node) {
      if (!isFirestoreFile()) {
        return;
      }

      const isZObjectCall = node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object &&
        node.callee.object.name === 'z' &&
        node.callee.property &&
        node.callee.property.name === 'object';

      if (!isZObjectCall) {
        return;
      }

      const callArgs = node.arguments;
      if (callArgs.length === 0 || callArgs[0].type !== 'ObjectExpression') {
        return;
      }

      callArgs[0].properties.forEach((prop) => {
        if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
          return;
        }

        const propName = prop.key.name;
        if (!isSnakeCase(propName)) {
          context.report({
            node: prop.key,
            messageId: 'notSnakeCase',
            data: {
              name: propName,
            },
          });
        }
      });
    }

    return {
      CallExpression: checkObjectProperties,
    };
  },
};
