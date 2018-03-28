"use strict";

const Mowa = require('../../server.js');
const Util = require('../../util.js');
const Error = require('../../error.js');
const _ = Util._;

class ModelValidationError extends Error.InvalidRequest {
    /**
     * Validation error against request input during model operation
     * @constructs Oolong:ModelValidationError
     * @extends Errors:InvalidRequest
     * @param {Array} errors - An array of errors
     */
    constructor(errors) {
        super('Validation failed.');

        this.name = 'ModelValidationError';
        this.errors = _.castArray(errors);

        this.errors.forEach(item => {
            this.message += `\n${ item.message || 'Invalid input.' }`;
            if (item.field) {
                this.message += ` Related field: "${item.field.name}"\n`;
            } else if (item.fields) {
                this.message += ` Related fields: "${ JSON.stringify(item.fields.map(f => f.name)) }"\n`;
            }
        });
    }
}

class ModelResultError extends Error.ServerError {
    /**
     * Unexpected database result
     * @constructs Oolong:ModelResultError
     * @extends Errors:ServerError
     * @param {string} message - Error message    
     */
    constructor(message) {        
        super(message);

        this.name = 'ModelResultError';
    }
}

class ModelOperationError extends Error.ServerError {
    /**
     * Error occurred during model operation
     * @constructs Oolong:ModelOperationError
     * @extends Errors:ServerError
     * @param {string} message - Error message
     * @param {string} [related]
     * @param {string} [detail]
     */
    constructor(message, related, detail) {
        if (related) {
            message += ', related: ' + related;
        }

        if (detail) {
            message += ', detail: ' + detail;
        }

        super(message);

        this.name = 'ModelOperationError';
    }
}

exports.ModelValidationError = ModelValidationError;
exports.ModelOperationError = ModelOperationError;