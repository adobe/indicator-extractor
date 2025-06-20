module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script',
  },
  rules: {
    // Possible Errors
    'no-console': 'off', // Allow console for CLI app
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Best Practices
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'prefer-const': 'error',

    // Stylistic Issues
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    // ES6
    'arrow-spacing': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
  },
};
