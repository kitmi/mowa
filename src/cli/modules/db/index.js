"use strict";

const path = require('path');

const Util = require('../../../util.js');
const _ = Util._;
const fs = Util.fs;
const glob = Util.glob;
const async = Util.async;

const oolong = require('../../../oolong');
const MowaHelper = require('../../mowa-helper.js');

/**
 * @module MowaCLI_Db
 * @summary Db module of Mowa CLI program.
 */

exports.moduleDesc = 'Provide commands to do database modeling.';

exports.commandsDesc = {
    'list': 'List all database connections',
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
            cmdOptions['dbms'] = {
                desc: 'Select the target dbms',
                inquire: true,
                promptType: 'list',
                required: true,
                choicesProvider: () => Promise.resolve(['mysql', 'mongodb'])
            };
            cmdOptions['db'] = {
                desc: 'Specify the name of the database',
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
exports.list = function (api) {
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

/**
 * Add a database connection
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa db add --key --value
 * @param api
 * @returns {*}
 */
exports.add = function (api) {
    pre: api, Util.Message.DBC_ARG_REQUIRED;

    api.log('verbose', 'exec => mowa db add');

    let appName = api.getOption('app');
    let dbms = api.getOption('dbms');
    let dbName = api.getOption('db');
    assert: {
        appName, Util.Message.DBC_VAR_NOT_NULL;
        dbms, Util.Message.DBC_VAR_NOT_NULL;
        dbName, Util.Message.DBC_VAR_NOT_NULL;
    }

    let conn = api.getOption('conn') || 'to be defined';

    let appModule = api.server.childModules[appName];
    if (!appModule) {
        return Promise.reject(`App "${appName}" is not mounted in the project. Run "mowa app mount" first.`);
    }

    return MowaHelper.writeConfigBlock_(appModule.configLoader, `${dbms}.${dbName}.connection`, conn);
};