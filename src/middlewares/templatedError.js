"use strict";

/**
 * @module Middleware_TemplatedError
 * @summary Error response middleware with template engines
 */

/**
 * @function
 * @param {Object} options - Template options
 * @property {string} options.template - Path to template written with your template engine
 * @property {string} options.engine - Path to template written with your template engine
 * @property {bool} options.cache - Path to template written with your template engine, default: NODE_ENV != 'development'
 * @property {string} [options.env='development'] - Path to template written with your template engine
 * @property {Array.<string>} options.accepts - Mimetypes passed to ctx.accepts, default: [ 'html', 'text', 'json' ]
 **/
const koaError = require('koa-error');

module.exports = koaError;