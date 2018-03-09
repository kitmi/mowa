const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.default.js');

module.exports = merge(common, {
    mode: 'development',
    devServer: {
       contentBase: path.resolve(__dirname, '{{ outputPath }}')
    }
});