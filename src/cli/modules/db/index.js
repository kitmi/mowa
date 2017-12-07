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
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'                
            };
            break;

        case 'add':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'
            };
            cmdOptions['key'] = {
                desc: 'Specify the key of the connection string'
            };
            cmdOptions['value'] = {
                desc: 'Specify the value of the connection string'
            };
            cmdOptions['for-server'] = {
                desc: 'Specify whether the connection is for server or for app',
                default: false,
                bool: true
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
    api.log('verbose', 'exec => mowa db list');

    return MowaHelper.getDbConnectionList(api).then(result => {
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
 * Add a database connection
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa db add --key --value
 * @param api
 * @returns {*}
 */
exports.add = function (api) {
    let appName = api.getOption('app');
    let isForServer = api.getOption('for-server');

    if (!appName && !isForServer) {
        return Promise.reject('Should specify an app name or use for-server option to add a new connection.');
    }

    const inquirer = require('inquirer');

    let key = api.getOption('key'), value = api.getOption('value');

    let getKey = () => key ?
        Promise.resolve(key) :
        inquirer.prompt([
            { type: 'input', name: 'key', message: 'Connection key:'}
        ]).then(function (answers) {
            if (answers.key && answers.key.length > 0) {
                return Promise.resolve(answers.key);
            }

            return Promise.reject('Invalid connection key!');
        });

    let getValue = k => value ?
        Promise.resolve(value) :
        inquirer.prompt([
            {type: 'input', name: 'value', message: 'Connection value:'}
        ]).then(function (answers) {
            if (answers.value && answers.value.length > 0) {
                return Promise.resolve([k, answers.value]);
            }

            return Promise.reject('Invalid connection value!');
        });

    return getKey().then(k => getValue(k)).then(([k, v]) => {
        if (isForServer) {
            
        } else {
            
        }
    });
};