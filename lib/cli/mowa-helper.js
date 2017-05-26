"use strict";

const Mowa = require('../server.js');
const _ = Mowa.Util._;

/**
 * @module MowaCLIHelpers
 * @summary Collection of Mowa runtime helpers.
 */

/**
 * Start a mowa server instance.
 * @param {MowaAPI} api
 * @returns {Promise}
 */
exports.startMowa = function (api) {
    let mowa = new Mowa(api.mowaName, {deaf: true, verbose: api.defaultConfig.mowaVerbose});
    return mowa.start();
};

/**
 * Get a list of app module instances by command-line option "app".
 * @param {MowaAPI} api
 * @param {MowaServer} server
 * @returns {Array}
 */
exports.getAppModules = function (api, server) {
    //get a list of apps
    let appName = api.getOption('app');
    let listingAppNames = api.getAppNames();

    if (appName) {
        if (!(appName in listingAppNames)) {
            throw new Error('App "' + appName + '" not exist!');
        }

        listingAppNames = [ appName ];
    }

    //read router config
     return _.map(listingAppNames, an => {
        let appModule = server.childModules[an];
        if (!appModule) {
            throw new Error('App "' + an + '" not activated in routing!');
        }

        return appModule;
    });
};

/**
 * Get a list of DBMS features.
 * @param {AppModule} appModule
 * @returns {Array}
 */
exports.getAllDbmsFeatures = function (appModule) {
    let dbmsFeatures = [];

    _.forOwn(appModule.features, (feature, name) => {
        if (feature.type === Mowa.Util.Feature.DBMS) {
            dbmsFeatures.push(name);
        }
    });

    return dbmsFeatures;
};