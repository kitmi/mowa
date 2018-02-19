"use strict";

const path = require('path');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

const oolong = require('../oolong');

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
    let mowa = new Mowa(api.mowaName, {deaf: true, verbose: api.config['general'].verbose});
    return mowa.start_();
};

/**
 * Rewrite config.
 * @param {Object} loader
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
 * @returns {Array.<AppModule>}
 */
exports.getRunningAppModules = function (api) {
    return _.values(api.server.childModules);
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
 * @returns {Array}
 */
exports.getDbConnectionList = function(api) {
    let serverDbs = {};
    let allAppDbs = {};

    let features = MowaHelper.getAllDbmsFeatures(api.server);

    features.forEach(feature => {
        let featureConfig = api.server.config[feature.name];

        _.forOwn(featureConfig, (config, name) => {
            serverDbs[name] = config.connection;
        });
    });

    let apps = MowaHelper.getRunningAppModules(api);

    apps.forEach(appModule => {

        features = MowaHelper.getAllDbmsFeatures(appModule);

        let appDbs = {};

        features.forEach(feature => {

            let featureConfig = appModule.config[feature.name];

            _.forOwn(featureConfig, (config, name) => {

                appDbs[name] = config.connection;

            });
        });

        allAppDbs[appModule.name] = appDbs;
    });

    return [ serverDbs, allAppDbs ];
};

exports.getAppDbConnections = function(api) {
    let appName = api.getOption('app');

    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        throw new Error(`App "${appName}" is not mounted in the project.`);
    }

    let conns = [];

    let features = MowaHelper.getAllDbmsFeatures(api.server);

    features.forEach(feature => {
        let featureConfig = api.server.config[feature.name];

        _.forOwn(featureConfig, (config, name) => {
            conns.push(feature.name + ':' + name);
        });
    });

    features = MowaHelper.getAllDbmsFeatures(appModule);

    let appDbs = {};

    features.forEach(feature => {

        let featureConfig = appModule.config[feature.name];

        _.forOwn(featureConfig, (config, name) => {
            conns.push(feature.name + ':' + name);
        });
    });

    return _.uniq(conns);
};

exports.getAppSchemas = function (api) {
    let appName = api.getOption('app');

    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        throw new Error(`App "${appName}" is not mounted in the project.`);
    }
    
    let schemas = [];

    let files = Util.glob.sync('*.ool', { cwd: appModule.oolongPath });

    files.forEach(f => {
        let linker = new oolong.Linker({ logger: api.logger, currentApp: appModule });
        linker.link(path.join(appModule.oolongPath, f));

        schemas = schemas.concat(_.values(linker.schemas));
    });

    return schemas.map(s => s.name);
};
