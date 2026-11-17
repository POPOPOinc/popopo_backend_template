import firestoreSnakeCase from './firestore-snake-case.js';
import firestoreKebabCase from './firestore-kebab-case.js';

export default {
  rules: {
    'firestore-snake-case': firestoreSnakeCase,
    'firestore-kebab-case': firestoreKebabCase,
  },
  configs: {
    recommended: {
      rules: {
        'schema/firestore-snake-case': 'error',
        'schema/firestore-kebab-case': 'error',
      },
    },
  },
};
