import {normalize, sep} from 'path';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce kebab-case naming for Firestore collection names in FirestorePaths',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [],
    messages: {
      notKebabCase: 'Firestore collection name "{{name}}" should be in kebab-case format',
    },
  },

  create(context) {
    function isKebabCase(name) {
      return /^[a-z][a-z0-9-]*$/.test(name);
    }

    function checkFirestorePaths(node) {
      const filename = context.getFilename();
      if (!filename.endsWith('firestore-paths.ts')) {
        return;
      }

      if (node.type !== 'VariableDeclarator') {
        return;
      }

      if (!node.id || node.id.name !== 'FirestorePaths') {
        return;
      }

      if (!node.init) {
        return;
      }
        
      let objectExpression = null;
      if (node.init.type === 'ObjectExpression') {
        objectExpression = node.init;
      } else if (node.init.type === 'TSAsExpression' && node.init.expression && node.init.expression.type === 'ObjectExpression') {
        objectExpression = node.init.expression;
      }
      
      if (!objectExpression) {
        return;
      }
      
      objectExpression.properties.forEach((prop) => {
        if (prop.type !== 'Property' || prop.value.type !== 'Literal' || typeof prop.value.value !== 'string') {
          return;
        }

        const collectionName = prop.value.value;
        if (!isKebabCase(collectionName)) {
          context.report({
            node: prop.value,
            messageId: 'notKebabCase',
            data: {
              name: collectionName,
            },
          });
        }
      });
    }

    return {
      VariableDeclarator: checkFirestorePaths,
    };
  },
};
