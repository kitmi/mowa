"use strict";

const HttpCode = require('./enum/httpcode.js');

const withName = (Base) => class extends Base {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }    
};

const withHttpStatus = (Base, STATUS) => class extends Base {
    /**
     * Http Status
     * @member {number}
     */
    status = STATUS;
};

const withExtraInfo = (Base) => class extends Base {
    constructor(message, extraInfo) {
        super(message);
        this.extraInfo = extraInfo;
    }
};

/**
 * @module Errors
 * @summary Error definitions.
 */

class InvalidConfiguration extends withExtraInfo(withName(withHttpStatus(Error, HttpCode.HTTP_INTERNAL_SERVER_ERROR))) {
    /**
    * Error caused by invalid configuration
    * @constructs Errors:InvalidConfiguration
    * @extends Error
    * @param {string} message - Error message
    * @param {AppModule} [appModule] - The related app module
    * @param {string} [item] - The related config item
    */
    constructor(message, appModule, item) {        
        super(message, { app: appModule.displayName, configNode: item });
    }
}

/**
 * Http BadRequest, 400
 * @class Errors:BadRequest
 */
class BadRequest extends withExtraInfo(withName(withHttpStatus(Error, HttpCode.HTTP_BAD_REQUEST))) {

};

class ServerError extends withExtraInfo(withName(withHttpStatus(Error, HttpCode.HTTP_INTERNAL_SERVER_ERROR))) {
    /**
     * Error caused by all kinds of runtime errors
     * @constructs Errors:ServerError
     * @extends Error
     * @param {string} message - Error message
     */
    constructor(message, code, otherExtra) {
        if (arguments.length === 2 && typeof code === 'object') {
            otherExtra = code;
            code = undefined;            
        } else if (code !== undefined && otherExtra && !('code' in otherExtra)) {
            otherExtra = Object.assign({}, otherExtra, { code });
        }

        super(message, otherExtra);

        if (code !== undefined) {
            /**
             * Error Code
             * @member {integer|string}
             */
            this.code = code;
        }
    }
}

exports.withName = withName;
exports.withHttpStatus = withHttpStatus;
exports.withExtraInfo = withExtraInfo;
exports.BadRequest = BadRequest;
exports.InvalidConfiguration = InvalidConfiguration;
exports.ServerError = ServerError;