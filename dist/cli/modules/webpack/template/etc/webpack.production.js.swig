const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.default.js');

module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ]
});