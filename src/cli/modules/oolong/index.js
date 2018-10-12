"use strict";

const path = require('path');

const oolong = require('../../../oolong');
const Mowa = require('../../../server.js');
const Util = require('../../../util.js');
const fs = Util.fs;
const _ = Util._;
const glob = Util.glob;
const Promise = Util.Promise;
const Convertors = require('../../../oolong/runtime/convertors');

const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Oolong
 * @summary Oolong module of Mowa CLI program.
 */

function listAvailableDataSet(api, db) {
    let appModule = MowaHelper.getAppModuleToOperate(api);

    let [ dbType, dbName ] = db.split(':');

    let dataSetPath = appModule.toAbsolutePath(Mowa.Literal.DB_SCRIPTS_PATH, dbType, dbName, 'data');

    if (!fs.existsSync(dataSetPath)) {
        return [];
    } else {
        let dataSets = fs.readdirSync(dataSetPath);
        let validDs = [];
        dataSets.forEach(ds => {
            let indexFile = path.join(dataSetPath, ds, 'index.list');
            if (fs.existsSync(indexFile)) {
                validDs.push(ds);
            }
        });

        return validDs;
    }
}

exports.moduleDesc = 'Provide commands to do database modeling.';

exports.commandsDesc = {
    'list': 'List all oolong schemas',
    'create': 'Create database schema',
    'config': 'Enable oolong feature and add deploy config',
    'build': 'Generate database script and access models',
    'deploy': 'Create database structure',
    'listDataSet': 'List available data set',
    'importData': 'Import data set',
    'reverse': 'Reverse engineering against a db (from db to ool)'
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
            cmdOptions['schema'] = {
                desc: 'Specify the schema name of the database',
                alias: [ 's' ],
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
            cmdOptions['schema'] = {
                desc: 'The name of the schema',
                promptMessage: 'Please select the target schema:',
                alias: [ 's' ],
                required: true,
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAppSchemas(api))
            };
            cmdOptions['conn'] = {
                desc: 'The connection of the target db to be deployed',
                promptMessage: 'Please select the target db connection:',
                alias: [ 'db', 'db-connection', 'connection' ],
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
                desc: 'The name of the app to operate',
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
                desc: 'The name of the app to operate',
                promptMessage: 'Please select the target app:',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['restify'] = {
                desc: 'Flag to generate restful endpoints',
                promptMessage: 'Whether to generate restful endpoints:',
                alias: [ 'rest' ],
                inquire: true,
                bool: true,
                promptDefault: false
            };
            cmdOptions['conn'] = {
                desc: 'The connection of the target db to be restify',
                promptMessage: 'Please select the target db connection:',
                alias: [ 'db', 'db-connection', 'connection' ],
                inquire: () => Convertors.toBoolean(api.getOption('restify')),
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAppDbConnections(api)
            };
            break;

        case 'listDataSet':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                promptMessage: 'Please select the target app:',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAvailableAppNames(api)
            };
            cmdOptions['conn'] = {
                desc: 'The connection of the target db to be listed',
                promptMessage: 'Please select the target db connection:',
                alias: [ 'db', 'db-connection', 'connection' ],
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAppDbConnections(api)
            };
            break;

        case 'importData':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                promptMessage: 'Please select the target app:',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAvailableAppNames(api)
            };
            cmdOptions['conn'] = {
                desc: 'The connection of the target db to be deployed',
                promptMessage: 'Please select the target db connection:',
                alias: [ 'db', 'db-connection', 'connection' ],
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAppDbConnections(api)
            };
            cmdOptions['dataSet'] = {
                desc: 'The name of the data set to import',
                promptMessage: 'Please select the target data set:',
                alias: [ 'ds', 'data' ],
                inquire: true,
                promptType: 'list',
                choicesProvider: () => listAvailableDataSet(api, api.getOption('db'))
            };
            break;

        case 'reverse':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                promptMessage: 'Please select the target app:',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAvailableAppNames(api)
            };
            cmdOptions['db'] = {
                desc: 'The name of the db to operate',
                promptMessage: 'Please select the target db:',
                inquire: true,
                promptType: 'list',
                choicesProvider: () => MowaHelper.getAppDbConnections(api)
            };
            cmdOptions['remove-table-prefix'] = {
                desc: 'To remove the table name prefix',
                alias: [ 'rmp', 'rm-prefix' ]
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};

exports.list = async (api) => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong list');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let schemas = MowaHelper.getAppSchemas(api);

    api.log('info', `Schemas in app [${appModule.name}]:\n${schemas.join('\n')}\n`);
};

/**
 * Create a database schema
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa oolong create -s <schema name> -c <connection key>
 * @param api
 * @returns {*}
 */
exports.create = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong create');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let schemaName = api.getOption('schema');

    assert: {
        schemaName, Util.Message.DBC_VAR_NOT_NULL;
    }
    
    let entitiesPath = path.join(appModule.oolongPath, 'entities');
    fs.ensureDirSync(entitiesPath);
    
    let schemaFile = path.join(appModule.oolongPath, `${schemaName}.ool`);
    if (fs.existsSync(schemaFile)) {
        return Promise.reject(`Oolong schema "${schemaName}" has already exist.`);
    }

    let templatePath = api.getTemplatePath('oolong');
    
    let schemaContent = fs.readFileSync(path.join(templatePath, 'schema.ool'));
    fs.writeFileSync(schemaFile, Util.template(schemaContent, { schemaName: schemaName }));
    api.log('info', `Created "${schemaName}.ool" file.`);
  
    fs.copySync(path.join(templatePath, 'sampleEntity.ool'), path.join(entitiesPath, 'sampleEntity.ool'));
    api.log('info', 'Created "sampleEntity.ool" file.');
};

exports.config = async (api) => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong config');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let schemaName = api.getOption('schema');
    let conn = api.getOption('conn');

    assert: {
        schemaName, Util.Message.DBC_VAR_NOT_NULL;
        conn, Util.Message.DBC_VAR_NOT_NULL;
        conn.indexOf(':') > 0, Util.Message.DBC_INVALID_ARG;
    }

    /*
    let [dbType, dbName] = db.split(':');

    let dbOfSchemaPath = `${dbType}.${dbName}.schema`;
    let dbOfSchema = Util.getValueByPath(appModule.config, dbOfSchemaPath);

    if (dbOfSchema && dbOfSchema !== schemaName) {
        return Promise.reject(`Database "${db}" has already been deployed with schema "${dbOfSchema}".`);
    }*/

    let configPath = `oolong.schemas.${schemaName}.deployTo`;

    let deployTo = Util.getValueByPath(appModule.config, configPath, []);

    if (deployTo.indexOf(conn) == -1) {
        deployTo.push(conn);
    }

    await MowaHelper.writeConfigBlock_(appModule.configLoader, configPath, deployTo);

    api.log('info', `Deployment of schema "${schemaName}" is configured.`);
};

exports.build = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong build');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    api.log('info', `Start building oolong dsl ...`);

    let oolongDir = appModule.oolongPath;

    if (!fs.existsSync(oolongDir)) {
        return Promise.reject(`Oolong DSL files not found. Nothing to build.`);
    }

    let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});

    let restify;
    if (api.getOption('restify')) {
        restify = api.getOption('db');
    }

    return Util.eachPromise_(_.map(schemaFiles, schemaFile => (() => oolong.build({
        logger: api.logger,
        currentApp: appModule,
        verbose: api.server.options.verbose
    }, schemaFile, restify))));
};

exports.deploy = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong deploy');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let reset = api.getOption('reset');

    api.log('info', `Start deploying database ...`);

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

exports.listDataSet = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong listDataSet');

    let db = api.getOption('db');

    let validDataSet = listAvailableDataSet(api, db);

    if (_.isEmpty(validDataSet)) {
        api.log('info', `No dataset available for "${db}".`);
    } else {
        api.log('info', 'Available data set:\n' + validDataSet.join('\n') + '\n');
    }
};

exports.importData = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong importData');

    let db = api.getOption('db');
    let dataSet = api.getOption('dataSet');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let [ dbType, dbName ] = db.split(':');
    let dataSetPath = appModule.toAbsolutePath(Mowa.Literal.DB_SCRIPTS_PATH, dbType, dbName, 'data', dataSet);

    if (!fs.existsSync(dataSetPath)) {
        return Promise.reject(`Data set "${dataSet}" not found in database "${db}".`);
    }

    let indexFile = path.join(dataSetPath, 'index.list');
    if (!fs.existsSync(indexFile)) {
        return Promise.reject(`Index list of data set "${dataSet}" not found in database "${db}".`);
    }

    return oolong.import({
        logger: api.logger,
        currentApp: appModule,
        verbose: api.server.options.verbose
    }, db, dataSetPath);
};

exports.reverse = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa oolong reverse');

    let appModule = MowaHelper.getAppModuleToOperate(api);
    let db = api.getOption('db');
    
    let removeTablePrefix = api.getOption('remove-table-prefix') || false;    

    let now = new Date();
    let folder = `extracted_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    let extractedOolPath = appModule.toAbsolutePath(Mowa.Literal.OOLONG_PATH, folder);
    let num = 1;

    while (fs.existsSync(extractedOolPath)) {
        let folder2 = folder + '_' + (++num).toString();
        extractedOolPath = appModule.toAbsolutePath(Mowa.Literal.OOLONG_PATH, folder2);
    }

    return oolong.reverse({
        logger: api.logger,
        currentApp: appModule,
        verbose: api.server.options.verbose,
        removeTablePrefix
    }, db, extractedOolPath);
};