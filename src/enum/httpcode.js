"use strict";

/**
 * HTTP status codes.
 * @readonly
 * @enum {number}
 */

const HttpCodes = module.exports = {
    /**
     * 200
     */
    HTTP_OK: 200,
    /**
     * 201
     */
    HTTP_CREATED: 201,

    /**
     * 301
     */
    HTTP_MOVED_PERMANENTLY: 301,
    /**
     * 302
     */
    HTTP_FOUND: 302,
    /**
     * 303
     */
    HTTP_SEE_OTHER: 303,
    /**
     * 307
     */
    HTTP_TEMPORARY_REDIRECT: 307,
    /**
     * 400
     */
    HTTP_BAD_REQUEST: 400,
    /**
     * 401
     */
    HTTP_UNAUTHORIZED: 401,
    /**
     * 403
     */
    HTTP_FORBIDDEN: 403,
    /**
     * 404
     */
    HTTP_NOT_FOUND: 404,
    /**
     * 405
     */
    HTTP_METHOD_NOT_ALLOWED: 405,
    /**
     * 429
     */
    HTTP_TOO_MANY_REQUESTS: 429,
    /**
     * 500
     */
    HTTP_INTERNAL_SERVER_ERROR: 500,
    /**
     * 503
     */
    HTTP_SERVICE_UNAVAILABLE: 503
};