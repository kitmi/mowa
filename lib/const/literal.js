"use strict";

require('debug')('tracing')(__filename);

/**
 * @module Literals
 * @summary Common constant definitions.
 */

module.exports = {
    /**
     * App modules path
     * @member {string}
     */
    APP_MODULES_PATH: 'app_modules',

    /**
     * Config files path
     * @member {string}
     */
    ETC_PATH: 'etc',

    /**
     * Backend files path
     * @member {string}
     */
    BACKEND_PATH: 'server',

    /**
     * Frontend files path
     * @member {string}
     */
    FRONTEND_PATH: 'client',

    /**
     * Middleware files path
     * @member {string}
     */
    MIDDLEWARES_PATH: 'middlewares',

    /**
     * Feature files path
     * @member {string}
     */
    FEATURES_PATH: 'features',

    /**
     * Server-wide config file name
     * @member {string}
     */
    SERVER_CFG_NAME: 'server',

    /**
     * App config file name
     * @member {string}
     */
    APP_CFG_NAME: 'app',

    /**
     * Controllers files path, under backend folder
     * @member {string}
     */
    CONTROLLERS_PATH: 'controllers',

    /**
     * Views files path, under backend folder
     * @member {string}
     */
    VIEWS_PATH: 'views',

    /**
     * Models files path, under backend folder
     * @member {string}
     */
    MODELS_PATH: 'models'
};