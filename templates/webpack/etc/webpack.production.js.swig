const webpack = require('webpack');
const merge = require('webpack-merge');
const makeDefault = require('./webpack.default.js');

const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = merge(makeDefault('production'), {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
        minimizer: [
            new OptimizeCSSAssetsPlugin({})
        ]
    },
});