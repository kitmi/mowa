"use strict";

const _ = require('lodash');

/**
 * Definition of ModelValidationError
 * Caused by validation error during model operation
 */
class ModelValidationError extends Error {
    constructor(message, related, detail) {
        if (related) {
            message += ', related: ' + related;
        }

        if (detail) {
            message += ', detail: ' + detail;
        }

        super(message);

        this.name = 'ModelValidationError';
        this.status = 400;
    }

    static fromErrors(errors, warnings, related) {
        return new ModelValidationError(
            ModelValidationError.VALIDATION_FAILED,
            related,
            _.map(errors, (e, i) => `error(${i}): ` + e.message).concat(_.map(warnings, (w, i) => `warning(${i}): ` + w.message)).join('\n')
        );
    }
}

ModelValidationError.INVALID_VALUE = 'INVALID_VALUE';
ModelValidationError.MISSING_REQUIRED_VALUE = 'MISSING_REQUIRED_VALUE';
ModelValidationError.VALIDATION_FAILED = 'VALIDATION_FAILED';

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