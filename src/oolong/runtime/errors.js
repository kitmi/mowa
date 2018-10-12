"use strict";

const Util = require('../../util.js');
const Error = require('../../error.js');
const _ = Util._;

/**
 * Errors caused by failing to pass input validation
 * @class Errors:ModelValidationError
 */
class ModelValidationError extends Error.BadRequest {
}

/**
 * Errors occurred during model operation.
 * @class Errors:ModelUsageError
 */
class ModelUsageError extends Error.ServerError {
}

/**
 * Errors occurred during model operation.
 * @class Errors:ModelOperationError
 */
class ModelOperationError extends Error.ServerError {    
}

exports.ModelValidationError = ModelValidationError;
exports.ModelUsageError = ModelUsageError;
exports.ModelOperationError = ModelOperationError;