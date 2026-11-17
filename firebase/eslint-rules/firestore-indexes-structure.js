export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validate firestore.indexes.json structure to catch deployment errors before PR submission",
      category: "Best Practices",
      recommended: true,
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    let hasRun = false;

    function validateIndexes() {
      if (hasRun) {
        return;
      }
      hasRun = true;

      // Get the parsed JSON data from the source code
      // Since we're using jsonc-eslint-parser, the source is the JSON file itself
      const sourceCode = context.getSourceCode();
      let data;
      try {
        data = JSON.parse(sourceCode.getText());
      } catch (e) {
        context.report({
          loc: { line: 1, column: 0 },
          message: `Invalid JSON - ${e.message}`,
        });
        return;
      }

      const validOrders = ["ASCENDING", "DESCENDING"];
      const validArrayConfigs = ["CONTAINS"];
      const validQueryScopes = ["COLLECTION", "COLLECTION_GROUP"];

      if (!data.indexes || !Array.isArray(data.indexes)) {
        context.report({
          loc: { line: 1, column: 0 },
          message: 'Missing or invalid "indexes" array',
        });
        return;
      }

      data.indexes.forEach((index, i) => {
        const indexPath = `indexes[${i}]`;

        const hasCollectionId = index.collectionId !== undefined;
        const hasCollectionGroup = index.collectionGroup !== undefined;

        if (!hasCollectionId && !hasCollectionGroup) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - Index must have either "collectionId" or "collectionGroup" property`,
          });
        }

        if (hasCollectionId && hasCollectionGroup) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - Index cannot have both "collectionId" and "collectionGroup" properties`,
          });
        }

        if (!index.fields || !Array.isArray(index.fields)) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - Index must have a "fields" array`,
          });
        } else if (index.fields.length === 0) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - "fields" array cannot be empty`,
          });
        } else if (index.fields.length < 2) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - Composite index must have at least 2 fields. Single-field indexes are automatically created by Firestore.`,
          });
        } else {
          index.fields.forEach((field, j) => {
            const fieldPath = `${indexPath}.fields[${j}]`;

            if (!field.fieldPath || typeof field.fieldPath !== "string") {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${fieldPath} - Field must have a valid "fieldPath" string`,
              });
            }

            if (field.fieldPath === "__name__") {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${fieldPath} - "__name__" is a placeholder shown in Firestore error messages and should not be used as an actual fieldPath. Remove this field from the index definition.`,
              });
            }

            if (field.order !== undefined && field.arrayConfig !== undefined) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${fieldPath} - Field cannot have both "order" and "arrayConfig" properties`,
              });
            }

            if (
              field.order !== undefined &&
              !validOrders.includes(field.order)
            ) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${fieldPath} - Invalid "order" value: "${field.order}". Must be one of: ${validOrders.join(", ")}`,
              });
            }

            if (
              field.arrayConfig !== undefined &&
              !validArrayConfigs.includes(field.arrayConfig)
            ) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${fieldPath} - Invalid "arrayConfig" value: "${field.arrayConfig}". Must be one of: ${validArrayConfigs.join(", ")}`,
              });
            }
          });
        }

        if (
          index.queryScope !== undefined &&
          !validQueryScopes.includes(index.queryScope)
        ) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `${indexPath} - Invalid "queryScope" value: "${index.queryScope}". Must be one of: ${validQueryScopes.join(", ")}`,
          });
        }
      });

      if (data.fieldOverrides && Array.isArray(data.fieldOverrides)) {
        data.fieldOverrides.forEach((override, i) => {
          const overridePath = `fieldOverrides[${i}]`;

          const hasCollectionId = override.collectionId !== undefined;
          const hasCollectionGroup = override.collectionGroup !== undefined;

          if (!hasCollectionId && !hasCollectionGroup) {
            context.report({
              loc: { line: 1, column: 0 },
              message: `${overridePath} - Field override must have either "collectionId" or "collectionGroup" property`,
            });
          }

          if (hasCollectionId && hasCollectionGroup) {
            context.report({
              loc: { line: 1, column: 0 },
              message: `${overridePath} - Field override cannot have both "collectionId" and "collectionGroup" properties`,
            });
          }

          if (hasCollectionId) {
            context.report({
              loc: { line: 1, column: 0 },
              message: `${overridePath} - Field override must use "collectionGroup" instead of "collectionId". Firebase does not support "collectionId" in fieldOverrides.`,
            });
          }

          if (
            !override.fieldPath ||
            typeof override.fieldPath !== "string"
          ) {
            context.report({
              loc: { line: 1, column: 0 },
              message: `${overridePath} - Field override must have a valid "fieldPath" string`,
            });
          }

          if (!override.indexes || !Array.isArray(override.indexes)) {
            context.report({
              loc: { line: 1, column: 0 },
              message: `${overridePath} - Field override must have an "indexes" array`,
            });
          } else {
            override.indexes.forEach((idx, j) => {
              const idxPath = `${overridePath}.indexes[${j}]`;

              if (
                idx.queryScope !== undefined &&
                !validQueryScopes.includes(idx.queryScope)
              ) {
                context.report({
                  loc: { line: 1, column: 0 },
                  message: `${idxPath} - Invalid "queryScope" value: "${idx.queryScope}". Must be one of: ${validQueryScopes.join(", ")}`,
                });
              }

              if (idx.order !== undefined && idx.arrayConfig !== undefined) {
                context.report({
                  loc: { line: 1, column: 0 },
                  message: `${idxPath} - Index cannot have both "order" and "arrayConfig" properties`,
                });
              }

              if (
                idx.order !== undefined &&
                !validOrders.includes(idx.order)
              ) {
                context.report({
                  loc: { line: 1, column: 0 },
                  message: `${idxPath} - Invalid "order" value: "${idx.order}". Must be one of: ${validOrders.join(", ")}`,
                });
              }

              if (
                idx.arrayConfig !== undefined &&
                !validArrayConfigs.includes(idx.arrayConfig)
              ) {
                context.report({
                  loc: { line: 1, column: 0 },
                  message: `${idxPath} - Invalid "arrayConfig" value: "${idx.arrayConfig}". Must be one of: ${validArrayConfigs.join(", ")}`,
                });
              }
            });

            // fieldOverrides を定義するとデフォルトの単一フィールドインデックス
            // (COLLECTION ASCENDING / DESCENDING) が上書きされる。
            // COLLECTION スコープのインデックスが欠落していると、
            // そのフィールドを使ったサブコレクション内クエリが FAILED_PRECONDITION エラーになる。
            const hasCollectionAsc = override.indexes.some(
              (idx) =>
                idx.queryScope === "COLLECTION" && idx.order === "ASCENDING"
            );
            const hasCollectionDesc = override.indexes.some(
              (idx) =>
                idx.queryScope === "COLLECTION" && idx.order === "DESCENDING"
            );

            const collectionName =
              override.collectionGroup ?? override.collectionId ?? "";

            if (!hasCollectionAsc) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${overridePath} - Field override for "${collectionName}.${override.fieldPath}" is missing COLLECTION ASCENDING index. fieldOverrides replaces default single-field indexes, so COLLECTION scope indexes must be explicitly included.`,
              });
            }
            if (!hasCollectionDesc) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${overridePath} - Field override for "${collectionName}.${override.fieldPath}" is missing COLLECTION DESCENDING index. fieldOverrides replaces default single-field indexes, so COLLECTION scope indexes must be explicitly included.`,
              });
            }
          }
        });
      }

      const indexKeys = new Set();
      data.indexes.forEach((index, i) => {
        const collectionName =
          index.collectionId ?? index.collectionGroup ?? "";
        const scope = index.queryScope ?? "COLLECTION";
        const fieldsKey = index.fields
          .map((f) => `${f.fieldPath}:${f.order ?? f.arrayConfig ?? ""}`)
          .join("|");
        const key = `${collectionName}:${scope}:${fieldsKey}`;

        if (indexKeys.has(key)) {
          context.report({
            loc: { line: 1, column: 0 },
            message: `indexes[${i}] - Duplicate index definition found for collection "${collectionName}" with the same fields and scope`,
          });
        }
        indexKeys.add(key);
      });
    }

    return {
      Program: validateIndexes,
    };
  },
};
