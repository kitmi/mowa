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
                desc: 'Specify the name of the app to operate'
            };
            break;

        case 'create':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'
            };
            cmdOptions['s'] = {
                desc: 'Specify the schema name of the database',
                alias: [ 'schema' ]
            };
            cmdOptions['conn'] = {
                desc: 'Specify the connection key of the database connection string',
                alias: [ 'connection' ]
            };
            cmdOptions['for-server'] = {
                desc: 'Specify whether the schema is for server or for app',
                default: false,
                bool: true
            };
            break;

        case 'deploy':
            cmdOptions['r'] = {
                desc: 'Reset all data if the database exists',
                default: false,
                alias: [ 'reset' ],
                bool: true
            };

        case 'build':
        case 'initTest':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'
            };
            cmdOptions['for-server'] = {
                desc: 'Specify to operate against the server app',
                default: false,
                bool: true
            };
            cmdOptions['all'] = {
                desc: 'Operate against all apps',
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

function buildAppByName(api, appModule) {
    api.log('info', `start building oolong dsl of app [${appModule.name}] ...`);

    let oolongDir = appModule.oolongPath;

    if (!fs.existsSync(oolongDir)) {
        return Promise.reject(`Oolong DSL files not found. Nothing to build for [${appModule.name}].`);
    }

    return MowaHelper.startMowa(api).then(server => {
        let schemaFiles = glob.sync(path.join(appModule.oolongPath, '*.ool'), {nodir: true});
        
        return Util.eachPromise(_.map(schemaFiles, f => (() => oolong.build({
                logger: api.logger,
                server: server,
                currentApp: appModule
            },
            f            
        ))));
    });
}

function startMowaAndRunWithSchemaFiles(api, command, callback) {
    let targetMod = api.getOption('app');

    return api.startMowa().then(server => {
        let moduleNames;

        if (targetMod) {
            if (!(targetMod in server.childModules)) {
                return Promise.reject(`Target web module [${targetMod}] is not enabled in server setting.`);
            }

            moduleNames = [ targetMod ];
        } else {
            moduleNames = Object.keys(server.childModules);
        }

        async.eachSeries(moduleNames, (moduleName, cb) => {
            if (command === 'deploy') {
                api.log('info', `Start deploying database of web module [${moduleName}] ...`);
            } else if (command == 'initTest') {
                api.log('info', `Start importing data of web module [${moduleName}] ...`);
            }

            let webModule = server.childModules[moduleName];
            let oolongDir = webModule.toAbsolutePath('oolong');

            if (!fs.existsSync(oolongDir)) {
                api.log('info', `Oolong DSL files not found. Nothing to do for [${moduleName}].`);

                return cb();
            }

            let schemaFiles = glob.sync(path.join(oolongDir, '*.ool'), {nodir: true});

            async.eachSeries(schemaFiles, callback(webModule), (err2) => {
                if (err2) return cb(err2);

                cb();
            });
        }, (err) => {
            if (err) return Promise.reject(err);

            server.stop();

            resolve();
        });
    });
}

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
 * Create a database schema
 * @example <caption>Create a database schema in oolong file</caption>
 * mowa oolong create -s <schema name> -c <connection key>
 * @param api
 * @returns {*}
 */
exports.create  = function (api) {
    api.log('verbose', 'exec => mowa db create');

    return MowaHelper.getDbConnectionList(api).then(result => {
        let serverDbs = result[0];
        let allAppDbs = result[1];
        let server = result[2];

        let appName = api.getOption('app');
        let isForServer = api.getOption('for-server');

        if (!appName && !isForServer) {
            return Promise.reject('Should specify an app name or use for-server option to create a new db schema.');
        }

        const inquirer = require('inquirer');

        let schemaName = api.getOption('s'), connectionKey = api.getOption('c');

        let getSchema = schemaName ?
            Promise.resolve(schemaName) :
            inquirer.prompt([
                { type: 'input', name: 'schema', message: 'Schema name: ' }
            ]).then(function (answers) {
                if (answers.schema && answers.schema.length > 0) {
                    return Promise.resolve(answers.schema);
                }

                return Promise.reject('Invalid schema name!');
            });

        let connectionList = [].concat(serverDbs);
        if (appName) {
            connectionList = connectionList.concat(allAppDbs[appName]);
        }

        let getConnection = connectionKey ?
            Promise.resolve(connectionKey) :
            inquirer.prompt([
                {type: 'list', name: 'connection', message: 'Select a db connections: ', choices: connectionList}
            ]).then(function (answers) {
                return Promise.resolve(answers.connection);
            });

        return getSchema().then(() => getConnection());
    }).then(connection => {
        console.log(connection);

        return Promise.resolve();
    });
};

exports.build = function (api) {
    api.log('verbose', 'exec => mowa oolong build');
    
    return MowaHelper.startMowa(api).then(server => {

        let appName = api.getOption('app');
        let all = api.getOption('all');
        let isForServer = api.getOption('for-server');

        if (!appName && !isForServer && !all) {
            return Promise.reject('App name is required or use isForServer option or use --all instead!');
        }

        let apps;

        if (all) {
            if (appName || isForServer) {
                api.log('warn', 'Running with "--all" specified will ignore "--app" and "--for-server" option.')
            }

            apps = MowaHelper.getAppModules(api, server);
        } else {
            if (isForServer) {
                if (appName) {
                    api.log('warn', 'Running with "--for-server" specified will ignore "--app" option.')
                }

                apps = [ server ];
            } else {
                let app = server.childModules[appName];
                if (!app) {
                    return Promise.reject('App "' + appName + '" not exist or not enabled in server.');
                }
                apps = [ app ];
            }
        }

        return Util.eachPromise(apps.map(appModule => () => buildAppByName(api, appModule)));
    });
};

exports.deploy = function (api) {
    api.log('verbose', 'exec => mowa oolong deploy');
    let reset = api.getOption('r') || false;

    return startMowaAndRunWithSchemaFiles(api, 'deploy', webModule => (f, cb) => {
        oolong.deploy(webModule, { logger: api.logger }, f, reset).then(() => cb(), e => cb(e));
    });
};

exports.initTest = function (api) {
    api.log('verbose', 'exec => mowa oolong initTest');

    return startMowaAndRunWithSchemaFiles(api, 'initTest', webModule => (f, cb) => {
        oolong.import(webModule, { logger: api.logger }, f, 'test').then(() => cb(), e => cb(e));
    });
};