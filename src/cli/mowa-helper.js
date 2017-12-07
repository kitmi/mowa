"use strict";

const path = require('path');
const Util = require('rk-utils');
const _ = Util._;
const fs = Util.fs;
const { Config, JsonConfigProvider } = require('rk-config');

const Mowa = require('../server.js');

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
exports.startMowa_ = function (api) {
    let mowa = new Mowa(api.mowaName, {deaf: true, verbose: api.config['general'].mowaVerbose});
    return mowa.start_();
};

/**
 * Rewrite config.
 * @param {ConfigLoader} loader
 * @param {string} key
 * @param {*} value
 * @returns {Promise}
 */
exports.writeConfigBlock_ = function (loader, key, value) {
    Util.setValueByPath(loader.provider.esConfig, key, value);
    return loader.provider.save();
};

/**
 * Get a list of available app names
 * @returns {Array}
 */
exports.getAvailableAppNames = function (api) {
    let appModulesPath = path.resolve(api.base, Mowa.Literal.APP_MODULES_PATH);

    let modules = fs.readdirSync(appModulesPath, 'utf8');

    return _.filter(modules, f => fs.lstatSync(path.join(appModulesPath, f)).isDirectory());
};

/**
 * Get a list of mounted app names
 * @returns {Promise} Collection of app route and name pairs
 */
exports.getMountedAppNames_ = function (api) {
    let mounted = {};

    return MowaHelper.loadServerConfig_(api).then(loader => {
        _.forOwn(loader.data.routing, (config, route) => {
            if (config.mod) {
                mounted[route] = config.mod.name;
            }
        });

        return mounted;
    });
};


/**
 * Get a list of running app module instances
 * @param {MowaAPI} api
 * @param {MowaServer} server
 * @returns {Array.<AppModule>}
 */
exports.getRunningAppModules = function (api, server) {
    return _.values(server.childModules);
};

/**
 * Get a list of DBMS features.
 * @param {AppModule} appModule
 * @returns {Array}
 */
exports.getAllDbmsFeatures = function (appModule) {
    return _.filter(appModule.features, { type: Mowa.Feature.DBMS });
};

/**
 * Get a list of DBMS connection string.
 * @param {MowaAPI} api
 * @returns {Promise} Array
 */
exports.getDbConnectionList_ = function(api) {
    let serverDbs = {};
    let allAppDbs = {};

    return MowaHelper.startMowa_(api).then(server => {

        let features = MowaHelper.getAllDbmsFeatures(server);

        features.forEach(feature => {
            let featureConfig = server.config[feature];

            _.forOwn(featureConfig, (config, name) => {
                serverDbs[name] = config.connection;
            });
        });

        let apps = MowaHelper.getRunningAppModules(api, server);

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
