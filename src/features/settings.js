"use strict";

/**
 * @module Feature_Setting
 * @summary Enable customized settings
 */

const Mowa = require('../server.js');
const Feature = require('../enum/feature');
const Util = Mowa.Util;
const Promise = Util.Promise;

module.exports = {

    /**
     * This feature is loaded at init stage
     * @member {string}
     */
    type: Feature.INIT,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} settings - Customized settings
     * @returns {Promise.<*>}
     */
    load_: function (appModule, settings) {
        appModule.settings = Object.assign({}, appModule.settings, settings);
        return Promise.resolve();
    }
};