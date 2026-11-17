import path from 'path';

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Prohibit use-case to use-case calls and service to use-case calls",
      category: "Best Practices",
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    function checkImports(node) {
      const sourceValue = node.source.value;
      if (!sourceValue || typeof sourceValue !== 'string') {
        return;
      }

      const filename = context.getFilename();
      const isUseCaseFile = filename.includes(path.sep + 'usecase' + path.sep) && filename.endsWith('-use-case.ts');
      const isServiceFile = filename.includes(path.sep + 'service' + path.sep) && filename.endsWith('-service.ts');

      const isUseCaseImport = sourceValue.endsWith('-use-case');
      const isCoreImport = sourceValue.endsWith('/core');

      if (isCoreImport && (isUseCaseFile || isServiceFile)) {
        const fileType = isUseCaseFile ? 'Use-case' : 'Service';
        context.report({
          node,
          message: `${fileType} should not import Core. Core is a service locator and should only be used in application entry points and controllers.`
        });
        return;
      }

      if (!isUseCaseImport) {
        return;
      }

      if (isUseCaseFile) {
        const currentUseCaseName = path.basename(filename, '.ts');
        const importedUseCaseName = sourceValue.split(path.posix.sep).pop();

        if (currentUseCaseName !== importedUseCaseName) {
          context.report({
            node,
            message: "Use-case should not import other use-cases. Consider using a service layer instead."
          });
        }
        return;
      }

      if (isServiceFile) {
        context.report({
          node,
          message: "Service should not import use-cases. Services should contain actual implementation logic, not use-case references."
        });
      }
    }

    function checkCoreUseCaseAccess(node) {
      const filename = context.getFilename();

      if (!filename.includes(path.sep + 'service' + path.sep) || !filename.endsWith('-service.ts')) {
        return;
      }

      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'Core' &&
        node.property.type === 'Identifier' &&
        node.property.name.endsWith('UseCase')
      ) {
        context.report({
          node,
          message: `Service should not access use-cases through Core. Found: Core.${node.property.name}. Services should contain actual implementation logic, not use-case references.`
        });
      }
    }

    return {
      ImportDeclaration: checkImports,
      MemberExpression: checkCoreUseCaseAccess,
    };
  }
};
