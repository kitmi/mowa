"use strict";

/**
 * @module Middleware_Webpack
 * @summary Webpack middleware
 */

const connect = require('koa-connect');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

/**
 * Initiate the webpack dev middleware
 * @param {Object} [options] - Template options
 * @param {AppModule} appModule - The owner app module
 **/
module.exports = function (options, appModule) {
    let extraConfig = Object.assign({}, options);
    let configPath = appModule.toAbsolutePath(appModule.options.etcPath, `webpack.${appModule.serverModule.env}.js`);

    let config = require(configPath);
    const compiler = webpack(config);

    return async (ctx, next) => {
        ctx.status = 200;
        return connect(webpackDevMiddleware(compiler, extraConfig))(ctx, next);
    }
};