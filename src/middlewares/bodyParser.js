"use strict";

/**
 * @module Middleware_BodyParser
 * @summary Http request body parser middleware
 */

const bodyParser = require('koa-bodyparser');

/**
 * @param [Object] opts
 *   - {String} jsonLimit default '1mb'
 *   - {String} formLimit default '56kb'
 *   - {string} encoding default 'utf-8'
 *   - {Object} extendTypes
 */
module.exports = bodyParser;