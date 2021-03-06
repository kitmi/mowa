exports.componentGroup = [
    'devServer',
    'babel loader',
    'css loader',
    'expose loader',
    'file loader',
    'sass loader',
    'clean plugin',
    'extract-text plugin'
];

exports.componentPackages = {
    'devServer': [ 'webpack-dev-server' ],
    'babel loader': [ 'babel-loader', 'babel-core', 'babel-preset-env', 'babel-preset-react' ],
    'css loader': [ 'css-loader', 'style-loader' ],
    'expose loader': [ 'expose-loader' ],
    'file loader': [ 'file-loader' ],
    'sass loader': [ 'sass-loader', 'node-sass' ],
    'clean plugin': [ 'clean-webpack-plugin' ],
    'extract-text plugin': [ 'extract-text-webpack-plugin' ]
};