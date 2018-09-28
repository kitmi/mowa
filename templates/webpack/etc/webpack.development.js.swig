const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const makeDefault = require('./webpack.default.js');

module.exports = merge(makeDefault('development'), {
    mode: 'development',
    devServer: {
       contentBase: path.resolve(__dirname, '{{ outputPath }}')
    }
});