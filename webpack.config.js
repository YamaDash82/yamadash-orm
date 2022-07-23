const path = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', 
  target: 'node', 
  externals: [ nodeExternals() ], 
  devtool: 'eval-source-map', 
  module: {
    rules: [
      {
        loader: 'ts-loader', 
        test: /\.ts$/, 
        exclude: [/node_modules/], 
        options: { configFile: 'tsconfig.test.json'}
      }
    ]
  }, 
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'test/src/connection-config.json', to: '' }
      ]
    })
  ], 
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }, 
  entry: './test/src/test.ts', 
  output: {
    filename: 'test.js', 
    path: path.resolve(__dirname, 'test/build')
  }, 
  node: {
    __dirname: false
  }
};