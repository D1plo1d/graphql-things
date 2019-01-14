import HtmlWebPackPlugin from 'html-webpack-plugin'
// import webpack from 'webpack'
import babelConfig from '../.babelrc'

module.exports = {
  entry: {
    app: './src/client.js',
  },
  output: {
    filename: './index.js',
  },
  // devServer: {
  //   contentBase: './src',
  //   hot: false,
  // },
  resolve: {
    modules: [
      'node_modules',
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './src/index.html',
      filename: './index.html',
    }),
    // new webpack.HotModuleReplacementPlugin(),
  ],
}
