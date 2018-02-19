"use strict";

/**
 * Common constant definitions.
 * @readonly
 * @enum {string}
 */

const Literals = module.exports = {
    /**
     * App modules path
     */
    APP_MODULES_PATH: 'app_modules',

    /**
     * Config files path
     */
    ETC_PATH: 'etc',

    /**
     * Backend files path
     */
    BACKEND_PATH: 'server',

    /**
     * Frontend source files path, e.g. react source
     */
    FRONTEND_PATH: 'client',

    /**
     * Frontend static files path, e.g. images, css, js
     */
    FRONTEND_STATIC_PATH: 'public',

    /**
     * Middleware files path
     */
    MIDDLEWARES_PATH: 'middlewares',

    /**
     * Feature files path
     */
    FEATURES_PATH: 'features',

    /**
     * Server-wide config file name
     */
    SERVER_CFG_NAME: 'server',

    /**
     * App config file name
     */
    APP_CFG_NAME: 'app',

    /**
     * Controllers files path, under backend folder
     */
    CONTROLLERS_PATH: 'controllers',

    /**
     * Controllers files path, under backend folder
     */
    RESOURCES_PATH: 'resources',

    /**
     * Remote calls controllers path
     */
    REMOTE_CALLS_PATH: 'remoteCalls',

    /**
     * Views files path, under backend folder
     */
    VIEWS_PATH: 'views',

    /**
     * Models files path, under backend folder
     */
    MODELS_PATH: 'models',

    /**
     * Oolong files path
     */
    OOLONG_PATH: 'oolong',

    /**
     * Database scripts path
     */
    DB_SCRIPTS_PATH: 'db_scripts',

    /**
     * Locale dictionary files path
     */
    LOCALE_PATH: 'locale'
};