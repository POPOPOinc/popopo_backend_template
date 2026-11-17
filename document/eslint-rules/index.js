import checkFirestorePathsCoverage from './check-firestore-paths-coverage.js';

export default {
  rules: {
    'check-firestore-paths-coverage': checkFirestorePathsCoverage,
  },
  configs: {
    recommended: {
      rules: {
        'document/check-firestore-paths-coverage': 'error',
      },
    },
  },
};
