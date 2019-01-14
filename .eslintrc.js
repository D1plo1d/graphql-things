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
  parser: 'babel-eslint',
  rules: {
    'semi': [2, 'never'],
    'func-names': ['error', 'never'],
    'consistent-return': 'off',
    'react/jsx-filename-extension': 'off'
  }
}
