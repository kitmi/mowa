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
    'list': 'List all the database connection strings.'
};

exports.help = function (api) {
    let cmdOptions = {};

    switch (api.command) {
        case 'list':
            cmdOptions['app'] = {
                desc: 'Specify the name of the app to operate'                
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