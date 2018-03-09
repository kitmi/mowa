const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

const clientPath = path.resolve(__dirname, '{{ clientPath }}');
let entryFiles = fs.readdirSync(clientPath);
let entry = {};

entryFiles.forEach(entryFile => {
    let f = path.join(clientPath, entryFile);
    if (fs.statSync(f).isFile()) {
        entry[path.basename(entryFile).split('.')[0]] = f;
    }
});

const outputPath = path.resolve(__dirname, '{{ outputPath }}');
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
        rules: [
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
                use: [
                    { loader: 'style-loader' },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true
                        }
                    }
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
            },
            {
                test: /\.(csv|tsv)$/,
                use: {
                    loader: 'csv-loader'
                }
            },
            {
                test: /\.xml$/,
                use: {
                    loader: 'xml-loader'
                }
            },
            {
                test: /\.txt$/,
                use: {
                    loader: 'raw-loader'
                }
            }
        ]
    },
    plugins: [
{% if cleanBeforeBuild %}
        new CleanWebpackPlugin([outputPath]),
{% endif %}
    ]
};