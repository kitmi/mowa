"use strict";

/**
 * @module Middleware_Compress
 * @summary Compress middleware
 */

/**
 * @function
 * @param {Object} options - The options are passed to zlib: http://nodejs.org/api/zlib.html#zlib_options
 * @example
 *  compress: {
 *      filter: "#!es6:${content_type => /text/i.test(content_type)}",
 *      threshold: 2048,
 *      flush: "#!es6:${require('zlib').Z_SYNC_FLUSH}"
 *  }
 */
const koaCompress = require('koa-compress');

module.exports = koaCompress;