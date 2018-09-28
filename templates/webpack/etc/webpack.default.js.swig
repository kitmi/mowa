const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

const clientPath = '{{ clientPath }}';
const clientAbsPath = path.resolve(__dirname, '..', clientPath);
const outputPath = '{{ outputPath }}';
const outputAbsPath = path.resolve(__dirname, '..', outputPath);
const publicPath = '{{ publicPath }}';

let entryFiles = fs.readdirSync(clientAbsPath);
let entry = {};

entryFiles.forEach(entryFile => {
    let f = path.join(clientAbsPath, entryFile);
    if (fs.statSync(f).isFile()) {
        entry[path.basename(entryFile).split('.')[0]] = f;
    }
});
{% if cleanBeforeBuild %}
const CleanWebpackPlugin = require('clean-webpack-plugin');
{% endif %}
{% if extractCss %}
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
{% endif %}
module.exports = env => ({
    entry: entry,
    resolve: {
        modules: [ clientPath, 'node_modules' ]
    },
    output: {
        path: outputAbsPath,
        filename: "[name].bundle.js",
        chunkFilename: "[id].bundle.js",
        publicPath: publicPath
    },
    module: {
        rules: [
            {
              test: /\.jsx?$/,
              exclude: /(node_modules|bower_components)/,
              use: {
                  loader: 'babel-loader',
                  options: {
                      presets: [
                          "@babel/preset-env", 
                          ["@babel/preset-react", {
                              development: env === "development",
                          }],
                      ],
                      "plugins": [
                          "@babel/plugin-proposal-object-rest-spread",
                          "@babel/plugin-proposal-class-properties"
                      ]
                  }
              }
            },
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
{% if extractCss %}      
                    { loader: MiniCssExtractPlugin.loader },
{% endif %}                                  
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.ts$/,
                use: 'ts-loader'
            },
            {
                test: /\.svg$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        prefix: 'svg'
                    }
                }
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        prefix: 'img'
                    }
                }
            },
            {
                test: /\.(woff2?|ttf|eot|otf)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        prefix: 'font'
                    }
                }
            }
        ]
    },
    plugins: [
{% if cleanBeforeBuild %}
        new CleanWebpackPlugin([outputPath]),
{% endif %}
{% if extractCss %}
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: "[name].css",
            chunkFilename: "[id].css"
        }),
{% endif %}
    ]
});