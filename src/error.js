"use strict";

const HttpCode = require('./enum/httpcode.js');

/**
 * @module Errors
 * @summary Error definitions.
 */

class InvalidConfiguration extends Error {
    /**
    * Error caused by invalid configuration
    * @constructs Errors:InvalidConfiguration
    * @extends Error
    * @param {string} message - Error message
    * @param {AppModule} [appModule] - The related app module
    * @param {string} [item] - The related config item
    */
    constructor(message, appModule, item) {
        message || (message = 'Invalid configuration.');
        if (appModule) message += ' ' + 'Module: ' + appModule.displayName;
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

class ServerError extends Error {
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
        this.name = 'ServerError';

        /**
         * Http status code
         * @member {integer}
         */
        this.status = HttpCode.HTTP_INTERNAL_SERVER_ERROR;
    }
}

exports.InvalidConfiguration = InvalidConfiguration;
exports.ServerError = ServerError;