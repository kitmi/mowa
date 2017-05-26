"use strict";

require('debug')('tracing')(__filename);

/**
 * @module HttpCodes
 * @summary HTTP status codes.
 */

module.exports = {
    /**
     * 200
     * @member {number}
     */
    HTTP_OK: 200,
    /**
     * 201
     * @member {number}
     */
    HTTP_CREATED: 201,

    /**
     * 301
     * @member {number}
     */
    HTTP_MOVED_PERMANENTLY: 301,
    /**
     * 302
     * @member {number}
     */
    HTTP_FOUND: 302,
    /**
     * 303
     * @member {number}
     */
    HTTP_SEE_OTHER: 303,

    /**
     * 307
     * @member {number}
     */
    HTTP_TEMPORARY_REDIRECT: 307,

    /**
     * 400
     * @member {number}
     */
    HTTP_BAD_REQUEST: 400,
    /**
     * 401
     * @member {number}
     */
    HTTP_UNAUTHORIZED: 401,
    /**
     * 403
     * @member {number}
     */
    HTTP_FORBIDDEN: 403,
    /**
     * 404
     * @member {number}
     */
    HTTP_NOT_FOUND: 404,
    /**
     * 405
     * @member {number}
     */
    HTTP_METHOD_NOT_ALLOWED: 405,

    /**
     * 500
     * @member {number}
     */
    HTTP_INTERNAL_SERVER_ERROR: 500,
    /**
     * 503
     * @member {number}
     */
    HTTP_SERVICE_UNAVAILABLE: 503
};