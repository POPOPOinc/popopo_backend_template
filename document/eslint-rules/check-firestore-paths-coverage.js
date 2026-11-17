import fs from 'fs';
import path from 'path';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all FirestorePaths are documented in documents.ts',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      missingPath: 'FirestorePath "{{pathName}}" is not documented in documents array. Please add an entry for this path.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    
    if (!filename.endsWith('documents.ts')) {
      return {};
    }

    function extractFirestorePathsFromSource() {
      try {
        const currentDir = path.dirname(filename);
        const rootDir = path.resolve(currentDir, '..');
        const firestorePathsFile = path.join(rootDir, 'schema', 'src', 'firestore-paths.ts');
        
        if (!fs.existsSync(firestorePathsFile)) {
          const altPath = path.join(rootDir, '..', 'schema', 'src', 'firestore-paths.ts');
          if (!fs.existsSync(altPath)) {
            return new Set();
          }
          return parseFirestorePaths(fs.readFileSync(altPath, 'utf8'));
        }
        
        const content = fs.readFileSync(firestorePathsFile, 'utf8');
        return parseFirestorePaths(content);
      } catch (error) {
        return new Set();
      }
    }

    function parseFirestorePaths(content) {
      const paths = new Set();
      
      const firestorePathsMatch = content.match(/export const FirestorePaths = \{([\s\S]*)\} as const/);
      if (!firestorePathsMatch) {
        return paths;
      }
      
      const objectContent = firestorePathsMatch[1];
      
      function findPathsInObject(objText, parentPath = '') {
        const lines = objText.split('\n');
        let currentKey = '';
        let braceDepth = 0;
        let inProperty = false;
        let propertyText = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          const propMatch = line.match(/^(\w+):\s*\{/);
          if (propMatch && braceDepth === 0) {
            currentKey = propMatch[1];
            inProperty = true;
            braceDepth = 1;
            propertyText = '';
            continue;
          }
          
          if (inProperty) {
            for (const char of line) {
              if (char === '{') braceDepth++;
              if (char === '}') braceDepth--;
            }
            
            propertyText += line + '\n';
            
            if (braceDepth === 0) {
              if (/\bpath:\s*['\"]/.test(propertyText)) {
                const fullPath = parentPath ? parentPath + '.' + currentKey : currentKey;
                
                const beforeNestedProps = propertyText.split(/\n\s*\w+:\s*\{/)[0];
                if (/\bgetDocPath\s*:\s*\(/.test(beforeNestedProps)) {
                  paths.add(fullPath);
                }
                
                findPathsInObject(propertyText, fullPath);
              }
              inProperty = false;
              currentKey = '';
              propertyText = '';
            }
          }
        }
      }
      
      findPathsInObject(objectContent);
      return paths;
    }

    function extractDocumentedPaths(node) {
      const documentedPaths = new Set();
      
      if (node.type !== 'ArrayExpression') {
        return documentedPaths;
      }

      node.elements.forEach(element => {
        if (element.type !== 'ObjectExpression') {
          return;
        }

        const pathProperty = element.properties.find(
          prop => prop.type === 'Property' && 
                  prop.key.type === 'Identifier' && 
                  prop.key.name === 'path'
        );

        if (!pathProperty || pathProperty.value.type !== 'TemplateLiteral') {
          return;
        }

        const templateLiteral = pathProperty.value;
        templateLiteral.expressions.forEach(expr => {
          let targetExpr = expr;
          
          if (expr.type === 'CallExpression' && expr.callee.type === 'MemberExpression') {
            targetExpr = expr.callee;
          }
          
          if (targetExpr.type === 'MemberExpression') {
            const pathKey = extractFirestorePathKey(targetExpr);
            if (pathKey) {
              documentedPaths.add(pathKey);
            }
          }
        });
      });

      return documentedPaths;
    }

    function extractFirestorePathKey(node) {
      const parts = [];
      let current = node;

      while (current) {
        if (current.type === 'MemberExpression') {
          if (current.property.type === 'Identifier' && 
              current.property.name !== 'path' && 
              current.property.name !== 'getPath' && 
              current.property.name !== 'getDocPath') {
            parts.unshift(current.property.name);
          }
          current = current.object;
        } else if (current.type === 'Identifier') {
          if (current.name !== 'FirestorePaths') {
            parts.unshift(current.name);
          }
          break;
        } else {
          break;
        }
      }

      return parts.length > 0 ? parts.join('.') : null;
    }

    return {
      'VariableDeclarator[id.name="documents"]'(node) {
        if (node.init.type !== 'ArrayExpression') {
          return;
        }

        const allDefinedPaths = extractFirestorePathsFromSource();
        
        if (allDefinedPaths.size === 0) {
          return;
        }

        const documentedPaths = extractDocumentedPaths(node.init);

        const missingPaths = [];
        for (const definedPath of allDefinedPaths) {
          if (!documentedPaths.has(definedPath)) {
            missingPaths.push(definedPath);
          }
        }

        missingPaths.forEach(pathName => {
          context.report({
            node: node.id,
            messageId: 'missingPath',
            data: {
              pathName: `FirestorePaths.${pathName}`
            }
          });
        });
      }
    };
  },
};
