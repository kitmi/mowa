"use strict";

require('debug')('tracing')(__filename);

/**
 * @module FeatureLevels
 * @summary Feature level tokens.
 */

module.exports = {
    /**
     * init group
     * @member {string}
     */
    INIT: '10-init',
    /**
     * dbms group
     * @member {string}
     */
    DBMS: '20-dbms',
    /**
     * service group
     * @member {string}
     */
    SERVICE: '30-service',
    /**
     * engine group
     * @member {string}
     */
    ENGINE: '40-engine',
    /**
     * engine group
     * @member {string}
     */
    MIDDLEWARE: '50-middleware',
    /**
     * routing group
     * @member {string}
     */
    ROUTING: '60-routing'
};