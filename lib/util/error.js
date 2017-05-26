"use strict";

require('debug')('tracing')(__filename);

const HttpCode = require('../const/httpcode.js');

/**
 * @module Errors
 * @summary Collection of error classes.
 */


class InvalidConfiguration extends Error {
    /**
    * Error caused by invalid configuration
    * @constructs Errors:InvalidConfiguration
    * @extends Error
    * @param {string} message - Error message
    * @param {string} [file] - File name of the configuration
    * @param {string} [item] - The base route of the  web module.
    */
    constructor(message, file, item) {
        message || (message = 'Invalid configuration.');
        if (file) message += ' ' + 'File: ' + file;
        if (item) message += ' ' + 'Item: ' + item;

        super(message);

        /**
         * Name of the error class
         * @member {string}
         **/
        this.name = 'InvalidConfiguration';
        /**
         * Http status code
         * @member {integer}
         */
        this.status = HttpCode.HTTP_INTERNAL_SERVER_ERROR;
    }
}

class InternalError extends Error {
    /**
     * Error caused by all kinds of runtime errors
     * @constructs Errors:InternalError
     * @extends Error
     * @param {string} message - Error message
     */
    constructor(message) {
        super(message);

        /**
         * Name of the error class
         * @member {string}
         */
        this.name = 'InternalError';

        /**
         * Http status code
         * @member {integer}
         */
        this.status = HttpCode.HTTP_INTERNAL_SERVER_ERROR;
    }
}

class BreakContractError extends Error {
    /**
     * Unexpected behavior against the design purpose, only thrown in {@link module:Utilities.contract}
     * @constructs Errors:BreakContractError
     * @extends Error
     * @param {string} principle - Design principle description
     */
    constructor(principle) {
        super(principle ? principle : 'Design contract Violation.');

        /**
         * Name of the error class
         * @member {string}
         */
        this.name = 'BreakContractError';

        /**
         * Http status code
         * @member {integer}
         */
        this.status = HttpCode.HTTP_INTERNAL_SERVER_ERROR;
    }
}

exports.InvalidConfiguration = InvalidConfiguration;
exports.InternalError = InternalError;
exports.BreakContractError = BreakContractError;