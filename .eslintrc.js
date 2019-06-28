module.exports = {
  env: {
    'browser': true,
    'es6': true,
    'jest/globals': true,
  },
  plugins: [
    'jest',
  ],
  extends: [
    'airbnb',
    'plugin:jest/recommended',
  ],
  rules: {
    'semi': [2, 'never'],
    'func-names': ['error', 'never'],
    'consistent-return': 'off',
    'react/jsx-filename-extension': 'off',
    "prefer-destructuring": ["error", {
      "VariableDeclarator": {
        "array": false,
        "object": true,
      },
      "AssignmentExpression": {
        "array": false,
        "object": false,
      }
    }, {
      "enforceForRenamedProperties": false
    }],
  }
}
