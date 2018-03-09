"use strict";

const path = require('path');

const oolong = require('../../../oolong');

const Util = require('../../../util.js');
const fs = Util.fs;
const _ = Util._;
const glob = Util.glob;
const Promise = Util.Promise;

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Oolong
 * @summary Oolong module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to do database modeling.';

exports.commandsDesc = {
    'list': 'List all oolong schemas',
    'create': 'Create database schema',
    'config': 'Enable oolong feature and add deploy config',
    'build': 'Generate database script and access models',
    'deploy': 'Create database structure'
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

        case 'config':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                inquire: true,
                required: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['s'] = {
                desc: 'The name of the schema to deploy',
                alias: [ 'schema' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAppSchemas(api))
            };
            cmdOptions['db'] = {
                desc: 'The name of the db to be deployed',
                alias: [ 'database' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => {
                    let conns = MowaHelper.getAppDbConnections(api);
                    if (_.isEmpty(conns)) {
                        throw new Error('Database connections not found. Config database connection first or run "mowa db add" first.');
                    }
                    return conns;
                }
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
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong list');

    let appName = api.getOption('app');

    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project.`);
    }

    let schemas = [];

    return new Promise((resolve, reject) => {
        Util.glob('*.ool', { cwd: appModule.oolongPath }, (err, files) => {
            if (err) return reject(err);

            files.forEach(f => {
                let linker = new oolong.Linker({ logger: api.logger, currentApp: appModule });
                linker.link(path.join(appModule.oolongPath, f));

                schemas = schemas.concat(_.values(linker.schemas));
            });

            api.log('info', `Defined schemas in app "${appName}":\n${schemas.map(s => s.name + ' in ' + s.oolModule.name + '.ool').join('\n')}\n`);

            resolve();
        });
    });
};

exports.config = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong config');

    let appName = api.getOption('app');
    let schemaName = api.getOption('s');
    let dbName = api.getOption('db');

    assert: {
        appName, Util.Message.DBC_VAR_NOT_NULL;
        schemaName, Util.Message.DBC_VAR_NOT_NULL;
        dbName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project.`);
    }

    let configPath = `oolong.schemas.${schemaName}`;

    let deployTo = Util.getValueByPath(appModule.config, configPath, []);

    if (deployTo.indexOf(dbName) == -1) {
        deployTo.push(dbName);
    }

    return MowaHelper.writeConfigBlock_(appModule.configLoader, configPath, { deployTo: deployTo }).then(() => {
        api.log('info', `Deployment of schema "${schemaName}" is configured.`);
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

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project.`);
    }
    
    let entitiesPath = path.join(appModule.oolongPath, 'entities');
    fs.ensureDirSync(entitiesPath);
    
    let schemaFile = path.join(appModule.oolongPath, `${schemaName}.ool`);
    if (fs.existsSync(schemaFile)) {
        return Promise.reject(`Oolong schema "${schemaName}" has already exist.`);
    }

    let templatePath = path.resolve(__dirname, 'template');

    let schemaContent = fs.readFileSync(path.join(templatePath, 'schema.ool'));
    fs.writeFileSync(schemaFile, Util.S(schemaContent).template({ schemaName: schemaName }).s);
    api.log('info', `Created "${schemaName}.ool" file.`);
  
    fs.copySync(path.join(templatePath, 'sampleEntity.ool'), path.join(entitiesPath, 'sampleEntity.ool'));
    api.log('info', 'Created "sampleEntity.ool" file.');
};

exports.build = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong build');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    api.log('info', `Start building oolong dsl for app [${appName}] ...`);

    let oolongDir = appModule.oolongPath;

    if (!fs.existsSync(oolongDir)) {
        return Promise.reject(`Oolong DSL files not found. Nothing to build.`);
    }

    let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});

    return Util.eachPromise_(_.map(schemaFiles, schemaFile => (() => oolong.build({
        logger: api.logger,
        currentApp: appModule,
        verbose: api.server.options.verbose
    }, schemaFile))));
};

exports.deploy = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong deploy');

    let appName = api.getOption('app');
    assert: appName, Util.Message.DBC_VAR_NOT_NULL;

    let reset = api.getOption('reset');

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    api.log('info', `Start deploying database for app [${appName}] ...`);

    let oolongDir = appModule.oolongPath;

    if (!fs.existsSync(oolongDir)) {
        return Promise.reject(`Oolong DSL files not found. Nothing to build.`);
    }

    let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});

    return Util.eachPromise_(_.map(schemaFiles, schemaFile => (() => oolong.deploy({
        logger: api.logger,
        currentApp: appModule,
        verbose: api.server.options.verbose
    }, schemaFile, reset))));
};