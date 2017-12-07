"use strict";

/**
 * @module Middleware_Views
 * @summary Template rendering middleware
 */

const Mowa = require('../server.js');
const path = require('path');
const views = require('koa-views');

/**
 * Initiate the views middleware
 * @param {Object} [options] - Template options
 * @property {string} [options.extension] - Default extension for your views
 * @property {Object} [options.map] - Extensions to engines map
 * @property {Object} [options.options] - View state locals
 * @property {bool} [options.options.cache] - Flag to enable cache 
 * @param {AppModule} appModule - The owner app module
 **/
module.exports = function (options, appModule) {
    return views(path.join(appModule.backendPath, Mowa.Literal.VIEWS_PATH), options);
};