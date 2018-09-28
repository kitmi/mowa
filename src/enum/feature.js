"use strict";

/**
 * Feature level tokens.
 * @readonly
 * @enum {string}
 */

const FeatureLevels = module.exports = {
    /**
     * Configuration
     */
    CONF: '00-conf',
    /**
     * Server initialization, e.g. bootstrap, settings
     */
    INIT: '10-init',
    /**
     * Database drivers, e.g. mysql, mongodb
     */
    DBMS: '20-dbms',
    /**
     * Services, e.g. loggers, i18n
     */
    SERVICE: '30-service',
    /**
     * Server engine, e.g. koa
     */
    ENGINE: '40-engine',
    /**
     * Attaching middlewares
     */
    MIDDLEWARE: '50-middleware',
    /**
     * Routing configuration
     */
    ROUTING: '60-routing'
};