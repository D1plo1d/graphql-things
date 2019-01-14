module.exports = {
  presets: [
    '@babel/preset-react',
    [
      "@babel/env",
      {
        "exclude": ["transform-regenerator", "transform-async-to-generator"],
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    'module:fast-async',
  ],
}
