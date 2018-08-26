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

    mowa.on('configLoaded', () => {
        let cliSettings = Util.getValueByPath(mowa.config.settings, 'cli');
        if (_.isEmpty(cliSettings)) {
            if ((api.cliModuleName !== 'default' || api.command !== 'init') && api.command !== 'help') {
                console.error("error: Command line settings not found. Please run 'mowa init' first.");
                process.exit(1);
            }
        }

        //override default config
        api.config = _.defaultsDeep({}, _.pick(cliSettings,
            ["consoleEnabled", "fileLogEnabled", "fileLogFilename", "fileLogOverwrite"]),
            api.config);

        mowa.options.verbose = api.config.general.verbose;
    });

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
    return loader.provider.save_();
};

/**
 * Get a list of available app names
 * @returns {Array}
 */
exports.getAvailableAppNames = function (api) {
    let appModulesPath = path.resolve(api.base, Mowa.Literal.APP_MODULES_PATH);

    if (!fs.existsSync(appModulesPath)) {
        throw new Error('No app modules found. You may run "mowa app create" to create the first app.');
    }

    let modules = fs.readdirSync(appModulesPath, 'utf8');

    return _.filter(modules, f => fs.lstatSync(path.join(appModulesPath, f)).isDirectory());
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
 * Get the app module object by the command line option "--app"
 * @param {MowaAPI} api
 * @returns {AppModule}
 */
exports.getAppModuleToOperate= function (api) {
    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        throw new Error(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    return appModule;
};

exports.getAppModuleDependencies = function (appModule) {
    let pkg = require(appModule.toAbsolutePath('package.json'));
    return pkg.dependencies || {};
};

/**
 * Get a list of DBMS features.
 * @param {AppModule} appModule
 * @returns {Array}
 */
exports.getAllDbmsFeatures = function (appModule) {
    console.log(appModule.features);

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

    features.forEach(feature => {

        let featureConfig = appModule.config[feature.name];

        _.forOwn(featureConfig, (config, name) => {
            conns.push(feature.name + ':' + name);
        });
    });

    return _.uniq(conns);
};

exports.getAppSchemas = function (api) {
    let appModule = exports.getAppModuleToOperate(api);
    
    let schemas = [];

    let files = Util.glob.sync('*.ool', { cwd: appModule.oolongPath });

    files.forEach(f => {
        let linker = new oolong.Linker({ logger: api.logger, currentApp: appModule });
        linker.link(path.join(appModule.oolongPath, f));

        schemas.push(linker.schema);
    });

    return schemas.map(s => s.name);
};

const excludesDir = [ '.', '..', 'node_modules', 'release', 'app_modules', 'log', 'logs' ];
const excludesFile = [ '.DS_Store', 'Thumbs.db' ];

exports.packFiles = (api, archive, sourceDir, basePath) => {
    let files = fs.readdirSync(sourceDir), targetPath;

    files.forEach(f => {
        let fp = path.join(sourceDir, f);
        let s = fs.statSync(fp);
        if (s.isDirectory()) {
            if (excludesDir.indexOf(f) === -1) {
                targetPath = basePath ? path.join(basePath, f) : f;
                archive.directory(fp, targetPath);
                api.log('info', `Adding directory "${targetPath}" ...`);
            }
        } else  if(s.isFile()) {
            if (excludesFile.indexOf(f) === -1 && path.extname(f) !== '.log') {
                targetPath = basePath ? path.join(basePath, f) : f;
                archive.file(fp, { name: targetPath });
                api.log('info', `Adding file "${targetPath}" ...`);
            }
        }
    });
};
