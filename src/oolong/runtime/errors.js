"use strict";

const _ = require('lodash');

/**
 * Definition of ModelValidationError
 * Caused by validation error during model operation
 */
class ModelValidationError extends Error {
    constructor(errors) {
        super('Validation failed.');

        this.name = 'ModelValidationError';
        this.status = 400;
        this.errors = errors;
    }
}

/**
 * Definition of ModelOperationError
 * Caused by  error during model operation
 */
class ModelOperationError extends Error {
    constructor(message, related, detail) {
        if (related) {
            message += ', related: ' + related;
        }

        if (detail) {
            message += ', detail: ' + detail;
        }

        super(message);

        this.name = 'ModelOperationError';
        this.status = 500;
    }
}

ModelOperationError.UPDATE_READ_ONLY_FIELD = 'UPDATE_READ_ONLY_FIELD';
ModelOperationError.REFERENCE_NON_EXIST_VALUE = 'REFERENCE_NON_EXIST_VALUE';
ModelOperationError.UNEXPECTED_STATE = 'UNEXPECTED_STATE';

exports.ModelValidationError = ModelValidationError;
exports.ModelOperationError = ModelOperationError;