"use strict";

/**
 * @module Feature_Middlewares
 * @summary Enable middlewares
 */

const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;

module.exports = {

    /**
     * This feature is loaded at middlwares-attaching stage
     * @member {string}
     */
    type: Mowa.Feature.MIDDLEWARE,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {*} middlewares - Middlewares and options
     * @returns {Promise.<*>}
     */
    load_: function (appModule, middlewares) {

        appModule.useMiddlewares(appModule.router, middlewares);

        return Promise.resolve();
    }
};