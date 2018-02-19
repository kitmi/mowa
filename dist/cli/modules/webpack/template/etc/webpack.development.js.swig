const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.default.js');

module.exports = merge(common, {
    devtool: 'inline-source-map',
    devServer: {
       contentBase: path.join('..', 'public')
    },
    plugins: [
        new webpack.DefinePlugin({
           'process.env.NODE_ENV': JSON.stringify('development')
        })
    ]
});