"use strict";

/**
 * @module Feature_Oolong
 * @summary Enable oolong DSL
 */

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;

module.exports = {
    /**
     * This feature is loaded at init stage
     * @member {string}
     */
    type: Mowa.Feature.INIT,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} oolong - Oolong settings
     * @property {bool} [oolong.logSqlStatement] - Flag to turn on sql debugging log
     * @returns {Promise.<*>}
     */
    load_: function (appModule, oolong) {
        appModule.oolong = oolong;

        appModule.on('after:' + Mowa.Feature.DBMS, () => {

            appModule.getDbSchema = function (schemaName) {
                if (!schemaName) {
                    if (defaultSchema in oolong) {
                        schemaName = oolong.defaultSchema;
                    } else {
                        throw new Error('Invalid schemaName!');
                    }
                }

                let dbFile = path.resolve(appModule.backendPath, Mowa.Literal.MODELS_PATH, schemaName + '.js');
                return require(dbFile);
            };
        });

        return Promise.resolve();
    }
};