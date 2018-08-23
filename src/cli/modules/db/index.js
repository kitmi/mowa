"use strict";

const path = require('path');
const shell = require('shelljs');
const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const glob = Util.glob;
const async = Util.async;

const oolong = require('../../../oolong');
const Mowa = require('../../../server.js');
const MowaHelper = require('../../mowa-helper.js');

const dbTypes = require('./dbms.js');

/**
 * @module MowaCLI_Db
 * @summary Db module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to do database modeling.';

exports.commandsDesc = {
    'list': 'List all database connections',
    'enable': 'Enable a kind of database support',
    'add': 'Add a database connection'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'list':
            break;

        case 'add':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                inquire: true,
                promptType: 'list',
                required: true,
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['type'] = {
                desc: 'The database type',
                promptMessage: 'Please select the target database type:',
                inquire: true,
                promptType: 'list',
                required: true,
                choicesProvider: () => Object.keys(dbTypes)
            };
            cmdOptions['db'] = {
                desc: 'The name of the database',
                promptMessage: 'Please input the name of the database:',
                inquire: true,
                required: true,
                alias: [ 'database' ]
            };
            cmdOptions['conn'] = {
                desc: 'Specify the value of the connection string',
                alias: [ 'c', 'connection' ],
                inquire: true
            };
            break;

        case 'enable':
            cmdOptions['app'] = {
                desc: 'The name of the app to operate',
                promptMessage: 'Please select the target app:',
                inquire: true,
                promptType: 'list',
                required: true,
                choicesProvider: () => Promise.resolve(MowaHelper.getAvailableAppNames(api))
            };
            cmdOptions['dbms'] = {
                desc: 'The dbms type',
                promptMessage: 'Please select the target dbms:',
                inquire: true,
                promptType: 'list',
                required: true,
                choicesProvider: () => Object.keys(dbTypes)
            };
            break;

        case 'help':
        default:
            //module general options
            break;
    }

    return cmdOptions;
};


/**
 * List all the database connection strings
 * @param {MowaAPI} api
 * @returns {Promise}
 */
exports.list = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa db list');

    let result = MowaHelper.getDbConnectionList(api);

    let serverDbs = result[0];
    let allAppDbs = result[1];
    let server = result[2];

    api.log('info', 'All server-wide database connections:\n' + JSON.stringify(serverDbs, null, 4) + '\n');

    _.forOwn(allAppDbs, (appDbs, appName) => {
        api.log('info', 'Database connections in app ['  + appName  +  ']:\n' + JSON.stringify(appDbs, null, 4) + '\n');
    });
};

exports.enable = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa db enable');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    let dbms = api.getOption('dbms');
    assert: {
        dbms, Util.Message.DBC_VAR_NOT_NULL;
    }

    if (!dbTypes[dbms]) {
        return Promise.reject(`Unknown dbms type: ${dbms}`);
    }

    let deps = MowaHelper.getAppModuleDependencies(appModule);
    let pkgs = dbTypes[dbms];    

    shell.cd(appModule.absolutePath);

    pkgs.forEach(p => {
        if (!(p in deps)) {
            let stdout = Util.runCmdSync(`npm i --save ${p}`);
            api.log('verbose', stdout);
        }
    });

    shell.cd(api.base);

    //copy feature
    let templateFeature = path.join(__dirname, 'template', 'mysql.template.js');
    let targetPath = appModule.toAbsolutePath(Mowa.Literal.FEATURES_PATH, 'mysql.js');
    if (!fs.existsSync(targetPath)) {
        fs.copySync(templateFeature, targetPath);
    }

    api.log('info', 'Enabled mysql feature.');
};

/**
 * Add a database connection
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa db add --key --value
 * @param api
 * @returns {*}
 */
exports.add = async api => {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa db add');

    let appModule = MowaHelper.getAppModuleToOperate(api);

    await exports.enable(api);

    let type = api.getOption('type');
    let dbName = api.getOption('db');
    assert: {
        dbName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let conn = api.getOption('conn') || 'to be defined';

    return MowaHelper.writeConfigBlock_(appModule.configLoader, `${type}.${dbName}.connection`, conn);
};