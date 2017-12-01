const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');

const clientPath = path.resolve('{{ clientPath }}');
let entryFiles = fs.readdirSync(clientPath);
let entry = {};

entryFiles.forEach(entryFile => {
    let f = path.join(clientPath, entryFile);
    if (fs.statSync(f).isFile()) {
        entry[path.basename(entryFile).split('.')[0]] = f;
    }
});

const outputPath = path.resolve('{{ outputPath }}');
{% if cleanBeforeBuild %}
const CleanWebpackPlugin = require('clean-webpack-plugin');
{% endif %}
module.exports = {
    name: '{{ profileName }}',
    entry: entry,
    output: {
        path: outputPath,
        filename: "[name].bundle.js",
        chunkFilename: "[id].bundle.js",
        publicPath: '{{ publicPath }}'
    },
    module: {
        loaders: [
            {
              test: /\.js$/,
              exclude: /(node_modules|bower_components)/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['babel-preset-env', 'babel-preset-react']
                }
              }
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            },
            {
                test: /\.svg$/,
                loader: 'file?prefix=svg'
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: 'file?prefix=img'
            },
            {
                test: /\.(woff2?|ttf|eot|otf)$/,
                loader: 'file?prefix=font'
            },
            {
                test: /\.(csv|tsv)$/,
                loader: 'csv-loader'
            },
            {
                test: /\.xml$/,
                loader: 'xml-loader'
            }
        ]
    },
    plugins: [
{% if cleanBeforeBuild %}
        new CleanWebpackPlugin([outputPath]),
{% endif %}
        new webpack.optimize.CommonsChunkPlugin({
            name: 'common' // Specify the common bundle's name.
        }),
        new ExtractTextPlugin("[name].style.css", { allChunks: true }),
    ]
};