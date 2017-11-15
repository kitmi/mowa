"use strict";

const path = require('path');

const Mowa = require('../server.js');
const _ = Mowa.Util._;
const fs = Mowa.Util.fs;

const MowaHelper = module.exports;

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


exports.readAppEtcValue = function (appName, keyPath, value) {
    let appModulePath = path.resolve(api.base, Mowa.Util.Literal.APP_MODULES_PATH, appName);
    if (!fs.existsSync(appModulePath)) {
        throw new Error(`App "${appName}" not exist.`);
    }
    
    
};

exports.writeAppEtcValue = function (appName, keyPath) {

};

exports.readServerEtcValue = function (appName, keyPath) {

};

exports.writeServerEtcValue = function (appName, keyPath, value) {

};

/**
 * Get a list of available app names
 * @returns {Array}
 */
exports.getAppNames = function (api) {
    let appModulesPath = path.resolve(api.base, Mowa.Util.Literal.APP_MODULES_PATH);

    let modules = fs.readdirSync(appModulesPath, 'utf8');

    return _.filter(modules, f => fs.lstatSync(path.join(appModulesPath, f)).isDirectory());
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
    let listingAppNames = MowaHelper.getAppNames(api);

    if (appName) {
        if (listingAppNames.indexOf(appName) === -1) {
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

/**
 * Get a list of DBMS connection string.
 * @param {MowaAPI} api
 * @returns {Array}
 */
exports.getDbConnectionList = function(api) {
    let serverDbs = {};
    let allAppDbs = {};

    return MowaHelper.startMowa(api).then(server => {

        let features = MowaHelper.getAllDbmsFeatures(server);

        features.forEach(feature => {
            let featureConfig = server.config[feature];

            _.forOwn(featureConfig, (config, name) => {
                serverDbs[name] = config.connection;
            });
        });

        let apps = MowaHelper.getAppModules(api, server);

        apps.forEach(appModule => {

            features = MowaHelper.getAllDbmsFeatures(appModule);
            let appDbs = {};

            features.forEach(feature => {

                let featureConfig = appModule.config[feature];

                _.forOwn(featureConfig, (config, name) => {

                    appDbs[name] = config.connection;

                });
            });

            allAppDbs[appModule.name] = appDbs;
        });

        return [ serverDbs, allAppDbs, server ];
    });
};
