import path from 'path'
import fs from 'fs'

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Detect missing Firestore composite indexes for queries with multiple where() and orderBy() constraints",
      category: "Best Practices",
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    let indexes = null
    
    function loadIndexes() {
      if (indexes !== null) {
        return indexes
      }
      
      try {
        const rootDir = context.getCwd()
        let indexPath = path.join(rootDir, 'firebase', 'src', 'firestore.indexes.json')
        
        if (!fs.existsSync(indexPath)) {
          indexPath = path.join(rootDir, '..', 'firebase', 'src', 'firestore.indexes.json')
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8')
        indexes = JSON.parse(indexContent)
        return indexes
      } catch (error) {
        return { indexes: [] }
      }
    }

    function extractCollectionNameFromCallExpression(node) {
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
        const methodName = node.callee.property.name
        if (methodName === 'collection' || methodName === 'collectionGroup') {
          if (node.arguments.length >= 2 && node.arguments[1].type === 'Literal') {
            return { name: node.arguments[1].value, scope: methodName === 'collectionGroup' ? 'COLLECTION_GROUP' : 'COLLECTION' }
          }
        }
        if (node.callee.object) {
          return extractCollectionNameFromCallExpression(node.callee.object)
        }
      }
      return null
    }

    function analyzeMethodChainQuery(node) {
      const constraints = []
      let currentNode = node
      let collectionInfo = null

      while (currentNode) {
        if (currentNode.type === 'CallExpression' && currentNode.callee.type === 'MemberExpression') {
          const methodName = currentNode.callee.property.name

          if (methodName === 'where' && currentNode.arguments.length >= 3) {
            const field = currentNode.arguments[0]
            const operator = currentNode.arguments[1]
            
            if (field.type === 'Literal' && operator.type === 'Literal') {
              const fieldPath = field.value
              const op = operator.value
              constraints.push({ fieldPath, order: 'ASCENDING', operator: op, isOrderBy: false })
            }
          } else if (methodName === 'orderBy' && currentNode.arguments.length >= 1) {
            const field = currentNode.arguments[0]
            const direction = currentNode.arguments[1]
            
            if (field.type === 'Literal') {
              const fieldPath = field.value
              let order = 'ASCENDING'
              
              if (direction && direction.type === 'Literal') {
                order = direction.value === 'desc' ? 'DESCENDING' : 'ASCENDING'
              }
              
              constraints.push({ fieldPath, order, isOrderBy: true })
            }
          }
          
          if (!collectionInfo) {
            collectionInfo = extractCollectionNameFromCallExpression(currentNode)
          }

          currentNode = currentNode.callee.object
        } else {
          break
        }
      }

      constraints.reverse()
      return { collectionInfo, constraints }
    }

    function analyzeArrayQuery(arrayNode, callNode) {
      const constraints = []
      let collectionInfo = null

      if (callNode && callNode.callee.type === 'MemberExpression') {
        const methodName = callNode.callee.property.name
        const collectionNameMap = {
          'getFollowers': null,
        }
        
        if (collectionNameMap[methodName] !== undefined) {
          if (collectionNameMap[methodName]) {
            collectionInfo = { name: collectionNameMap[methodName], scope: 'COLLECTION' }
          } else if (methodName === 'getFollowers') {
            collectionInfo = { name: 'followers', scope: 'COLLECTION_GROUP' }
          }
        }
      }

      for (const element of arrayNode.elements) {
        if (element.type === 'CallExpression') {
          let methodName = null
          
          if (element.callee.type === 'Identifier') {
            methodName = element.callee.name
          } else if (element.callee.type === 'MemberExpression' && element.callee.property.type === 'Identifier') {
            methodName = element.callee.property.name
          }

          if (methodName === 'where' && element.arguments.length >= 3) {
            const field = element.arguments[0]
            const operator = element.arguments[1]
            
            if (field.type === 'Literal' && operator.type === 'Literal') {
              const fieldPath = field.value
              const op = operator.value
              constraints.push({ fieldPath, order: 'ASCENDING', operator: op, isOrderBy: false })
            }
          } else if (methodName === 'orderBy' && element.arguments.length >= 1) {
            const field = element.arguments[0]
            const direction = element.arguments[1]
            
            if (field.type === 'Literal') {
              const fieldPath = field.value
              let order = 'ASCENDING'
              
              if (direction && direction.type === 'Literal') {
                order = direction.value === 'desc' ? 'DESCENDING' : 'ASCENDING'
              }
              
              constraints.push({ fieldPath, order, isOrderBy: true })
            }
          }
        }
      }

      return { collectionInfo, constraints }
    }

    function checkIndexExists(collectionName, constraints, queryScope) {
      const indexData = loadIndexes()
      
      if (constraints.length < 2) {
        return true
      }

      const whereConstraints = constraints.filter(c => !c.isOrderBy)
      const orderByConstraints = constraints.filter(c => c.isOrderBy)

      if (whereConstraints.length < 2 && !(whereConstraints.length >= 1 && orderByConstraints.length >= 1)) {
        return true
      }

      const requiredFields = constraints.map(c => ({
        fieldPath: c.fieldPath,
        order: c.order
      }))

      const matchingIndexes = indexData.indexes.filter(index => {
        if (index.collectionId !== collectionName && index.collectionGroup !== collectionName) {
          return false
        }
        
        if (index.queryScope && queryScope && index.queryScope !== queryScope) {
          return false
        }

        if (index.fields.length < requiredFields.length) {
          return false
        }

        for (let i = 0; i < requiredFields.length; i++) {
          const required = requiredFields[i]
          const indexField = index.fields[i]
          
          if (!indexField) {
            return false
          }

          if (indexField.fieldPath !== required.fieldPath) {
            return false
          }

          if (indexField.order && required.order && indexField.order !== required.order) {
            return false
          }
        }

        return true
      })

      return matchingIndexes.length > 0
    }

    function checkMethodChain(node) {
      if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
        return
      }

      const methodName = node.callee.property.name
      
      if (methodName === 'query' && node.arguments.length > 1) {
        let collectionInfo = extractCollectionNameFromCallExpression(node.arguments[0])
        
        if (!collectionInfo || !collectionInfo.name) {
          let parentNode = node.parent
          while (parentNode) {
            if (parentNode.type === 'MethodDefinition' || parentNode.type === 'FunctionDeclaration') {
              const funcName = parentNode.key?.name || parentNode.id?.name
              if (funcName === 'getShopCustomTags') {
                collectionInfo = { name: 'shop-custom-tags', scope: 'COLLECTION' }
                break
              } else if (funcName === 'getShopBanners') {
                collectionInfo = { name: 'shop-banners', scope: 'COLLECTION' }
                break
              }
            }
            parentNode = parentNode.parent
          }
        }
        
        if (!collectionInfo || !collectionInfo.name) {
          return
        }
        
        const constraints = []
        for (let i = 1; i < node.arguments.length; i++) {
          const arg = node.arguments[i]
          if (arg.type === 'CallExpression' && arg.callee.type === 'MemberExpression') {
            const argMethodName = arg.callee.property.name
            
            if (argMethodName === 'where' && arg.arguments.length >= 3) {
              const field = arg.arguments[0]
              const operator = arg.arguments[1]
              
              if (field.type === 'Literal' && operator.type === 'Literal') {
                const fieldPath = field.value
                const op = operator.value
                constraints.push({ fieldPath, order: 'ASCENDING', operator: op, isOrderBy: false })
              }
            } else if (argMethodName === 'orderBy' && arg.arguments.length >= 1) {
              const field = arg.arguments[0]
              const direction = arg.arguments[1]
              
              if (field.type === 'Literal') {
                const fieldPath = field.value
                let order = 'ASCENDING'
                
                if (direction && direction.type === 'Literal') {
                  order = direction.value === 'desc' ? 'DESCENDING' : 'ASCENDING'
                }
                
                constraints.push({ fieldPath, order, isOrderBy: true })
              }
            }
          }
        }
        
        if (constraints.length >= 2) {
          const indexExists = checkIndexExists(collectionInfo.name, constraints, collectionInfo.scope)
          
          if (!indexExists) {
            const fieldList = constraints.map(c => `${c.fieldPath} (${c.order})`).join(', ')
            context.report({
              node,
              message: `Missing Firestore index for collection "${collectionInfo.name}". Query requires composite index with fields: ${fieldList}. Please add the index to firebase/src/firestore.indexes.json`
            })
          }
        }
        return
      }
      
      if (methodName !== 'where' && methodName !== 'orderBy') {
        return
      }

      const { collectionInfo, constraints } = analyzeMethodChainQuery(node)

      if (!collectionInfo || !collectionInfo.name || constraints.length < 2) {
        return
      }

      const indexExists = checkIndexExists(collectionInfo.name, constraints, collectionInfo.scope)

      if (!indexExists) {
        const fieldList = constraints.map(c => `${c.fieldPath} (${c.order})`).join(', ')
        context.report({
          node,
          message: `Missing Firestore index for collection "${collectionInfo.name}". Query requires composite index with fields: ${fieldList}. Please add the index to firebase/src/firestore.indexes.json`
        })
      }
    }

    function checkArrayPattern(node) {
      if (node.type !== 'ArrayExpression') {
        return
      }

      const parent = node.parent
      if (!parent || parent.type !== 'CallExpression' || !parent.arguments.includes(node)) {
        return
      }

      const { collectionInfo, constraints } = analyzeArrayQuery(node, parent)

      if (!collectionInfo || !collectionInfo.name || constraints.length < 2) {
        return
      }

      const indexExists = checkIndexExists(collectionInfo.name, constraints, collectionInfo.scope)

      if (!indexExists) {
        const fieldList = constraints.map(c => `${c.fieldPath} (${c.order})`).join(', ')
        context.report({
          node,
          message: `Missing Firestore index for collection "${collectionInfo.name}". Query requires composite index with fields: ${fieldList}. Please add the index to firebase/src/firestore.indexes.json`
        })
      }
    }

    return {
      CallExpression: checkMethodChain,
      ArrayExpression: checkArrayPattern
    }
  }
}
