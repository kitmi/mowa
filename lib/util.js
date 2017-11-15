"use strict";

require('debug')('tracing')(__filename);

const RkUtil = require('rk-utils');

/**
 * @module Utilities
 * @summary Collection of utilities.
 */

const U = module.exports = RkUtil._.assignIn({}, RkUtil, {

    /**
     * A lightweight JavaScript date library for parsing, validating, manipulating, and formatting dates.
     * See {@link https://momentjs.com}
     * @member {moment}
     */
    get moment() { return require('moment'); },

    /**
     * Parse and display moments in any timezone.
     * See {@link https://momentjs.com/timezone}
     * @member {moment}
     */
    get timezone() { return require('moment-timezone'); },

    /**
     * Create a least recently used cache object.
     * @param {object} options
     * @returns {LRUCache}
     */
    createLRUCache(options) { var LRU = require("lru-cache"); return new LRU(options); },

    /**
     * Error class definitions.
     * @member {module:Errors}
     */
    get Error() { return require('./util/error.js'); },

    /**
     * Http status codes definitions.
     * @member {HttpCodes}
     */
    get HttpCode() { return require('./enum/httpcode.js'); },

    /**
     * Common regexp patterns.
     * @member {Patterns}
     */
    get Pattern() { return require('./enum/pattern.js'); },

    /**
     * Feature levels definitions.
     * @member {FeatureLevels}
     */
    get Feature() { return require('./enum/feature.js'); },

    /**
     * Common constants.
     * @member {Literals}
     */
    get Literal() { return require('./enum/literal.js'); },

});