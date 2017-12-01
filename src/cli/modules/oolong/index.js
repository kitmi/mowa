"use strict";

const path = require('path');

const oolong = require('../../../oolong');

const Util = require('../../../util.js');
const fs = Util.fs;
const _ = Util._;
const glob = Util.glob;
const async = Util.async;

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Oolong
 * @summary Oolong module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to do database modeling.';

exports.commandsDesc = {
    'list': 'List all database connections',
    'create': 'Create database schema',
    'build': 'Generate database script and access models',
    'deploy': 'Create database structure',
    'initTest': 'Import test data'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'list':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            break;

        case 'create':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['s'] = {
                desc: 'Specify the schema name of the database',
                alias: [ 'schema' ],
                required: true,
                inquire: true
            };
            break;

        case 'deploy':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['r'] = {
                desc: 'Reset all data if the database exists',
                required: true,
                alias: [ 'reset' ],
                bool: true,
                inquire: true
            };
            break;

        case 'build':
        case 'initTest':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.list = function (api) {
    api.log('verbose', 'exec => mowa db list');

    return MowaHelper.getDbConnectionList_(api).then(result => {
        let serverDbs = result[0];
        let allAppDbs = result[1];
        let server = result[2];

        api.log('info', 'All server-wide database connections:\n' + JSON.stringify(serverDbs, null, 4) + '\n');

        _.forOwn(allAppDbs, (appDbs, appName) => {
            api.log('info', 'Database connections in app ['  + appName  +  ']:\n' + JSON.stringify(appDbs, null, 4) + '\n');
        });

        return server.stop();
    });
};

/**
 * Create a database schema
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa oolong create -s <schema name> -c <connection key>
 * @param api
 * @returns {*}
 */
exports.create  = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong create');

    let appName = api.getOption('app');
    let schemaName = api.getOption('s');

    assert: {
        appName, Util.Message.DBC_VAR_NOT_NULL;
        schemaName, Util.Message.DBC_VAR_NOT_NULL;
    }

    return MowaHelper.startMowa_(api).then(server => {
        let appModule = server.childModules[appName];
        if (!appModule) {
            return Promise.reject(`App "${appName}" is not mounted in the project.`);
        }
        
    });    
};

exports.build = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong build');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;
    
    return MowaHelper.startMowa_(api).then(server => {
        let appModule = server.childModules[appName];
        if (!appModule) {
            return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
        }

        api.log('info', `Start building oolong dsl for app [${appName}] ...`);

        let oolongDir = appModule.oolongPath;

        if (!fs.existsSync(oolongDir)) {
            return Promise.reject(`Oolong DSL files not found. Nothing to build.`);
        }

        let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});

        return Util.eachPromise(_.map(schemaFiles, schemaFile => (() => oolong.build({
            logger: api.logger,
            currentApp: appModule
        }, schemaFile))));
    });
};

exports.deploy = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong deploy');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let reset = api.getOption('reset');

    return MowaHelper.startMowa_(api).then(server => {
        let appModule = server.childModules[appName];
        if (!appModule) {
            return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
        }

        api.log('info', `Start deploying database for app [${appName}] ...`);

        let oolongDir = appModule.oolongPath;

        if (!fs.existsSync(oolongDir)) {
            return Promise.reject(`Oolong DSL files not found. Nothing to build.`);
        }

        let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});

        return Util.eachPromise(_.map(schemaFiles, schemaFile => (() => oolong.deploy({
            logger: api.logger,
            currentApp: appModule
        }, schemaFile, reset))));
    });
};

exports.initTest = function (api) {
    api.log('verbose', 'exec => mowa oolong initTest');

    return startMowaAndRunWithSchemaFiles(api, 'initTest', appModule => (f, cb) => {
        oolong.import({ logger: api.logger, currentApp: appModule }, f, 'test').then(() => cb(), e => cb(e));
    });
};