"use strict";

/**
 * @module Feature_Bootstrap
 * @summary Enable bootstrap scripts
 */

const path = require('path');
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
     * @param {object} options - Options for the feature
     * @property {string} [options.path='server/boostrap'] - The path of the bootstrap scripts
     * @returns {Promise.<*>}
     */
    load_: function (appModule, options) {
        let bootPath = options.path ?
            appModule.toAbsolutePath(options.path) :
            path.join(appModule.backendPath, 'bootstrap');
        let bp = path.join(bootPath, '**', '*.js');

        return Promise.promisify(Util.glob)(bp, {nodir: true}).mapSeries(file => {
            require(file)(appModule);
        });
    }
};