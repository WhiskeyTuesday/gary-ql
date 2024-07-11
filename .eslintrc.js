module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['airbnb-base'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'max-len': ['error', { code: 80 }],
    'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
    'object-curly-newline': ['error', { consistent: true, minProperties: 9 }],
    'object-property-newline': ['off'],
    'newline-per-chained-call': ['error', { ignoreChainWithDepth: 8 }],
    'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-else-return': ['off'],
    'no-shadow': ['error', { allow: ['_'] }],
  },
};
