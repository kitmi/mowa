"use strict";

const path = require('path');

const Util = require('../util.js');
const _ = Util._;
const Linker = require('./lang/linker.js');

/**
 * @module Oolong
 * @summary Oolong DSL lib
 */

/**
 * Build database scripts from oolong files
 * @param {object} context
 * @property {Logger} context.logger - Logger object
 * @property {AppModule} context.currentApp - Current app module
 * @param {string} schemaFile
 */
exports.build = function (context, schemaFile) {
    let oolongConfig = context.currentApp.config.oolong;

    if (!oolongConfig) {
        return Promise.reject('Missing oolong config in app module "' + context.currentApp.name + '".');
    }

    if (!oolongConfig.schemas) {
        throw new Error('No schemas configured in oolong config.');
    }

    let linker = new Linker(context);
    linker.link(schemaFile);

    let buildPath = path.join(context.currentApp.backendPath, Util.Literal.DB_SCRIPTS_PATH);

    if (_.isEmpty(linker.schemas)) {
        throw new Error('No schema found in the linker.');
    }

    let schemas = [];
    
    _.forOwn(linker.schemas, (schema, schemaName) => {
        if (!(schemaName in oolongConfig.schemas)) {
            throw new Error('Schema "' + schemaName + '" not exist in oolong config.');
        }

        let schemaOolongConfig = oolongConfig.schemas[schemaName];
        let deployment = _.isArray(schemaOolongConfig.deployTo) ? schemaOolongConfig.deployTo : [ schemaOolongConfig.deployTo ];

        _.each(deployment, dbServiceKey => {
            let service = context.currentApp.getService(dbServiceKey);
            let dbmsOptions = Object.assign({}, service.dbmsSpec);

            let DbModeler = require(`./modeler/db/${service.dbmsType}.js`);
            let dbModeler = new DbModeler(linker, dbmsOptions);

            schemas.push(dbModeler.modeling(schema, buildPath));
        });
    });

    const DaoModeler = require('./modeler/dao.js');
    let daoModeler = new DaoModeler(linker, path.resolve(context.currentApp.backendPath, context.currentApp.options.modelsPath));

    _.each(schemas, schema => {
        let schemaOolongConfig = oolongConfig.schemas[schema.name];
        assert: schemaOolongConfig, Util.Message.DBC_VAR_NOT_NULL;

        let deployment = _.isArray(schemaOolongConfig.deployTo) ? schemaOolongConfig.deployTo : [ schemaOolongConfig.deployTo ];

        _.each(deployment, dbServiceKey => {
            let service = context.currentApp.getService(dbServiceKey);

            daoModeler.modeling(schema, service);
        });
    });

    return Promise.resolve();
};

/**
 * Deploy database
 * @param {object} context
 * @param {string} schemaFile
 * @param {bool} reset
 * @returns {Promise}
 */
exports.deploy = function (context, schemaFile, reset = false) {
    let oolongConfig = context.currentApp.config.oolong;

    if (!oolongConfig) {
        return Promise.reject('Missing oolong config in app module "' + context.currentApp.name + '".');
    }

    if (!oolongConfig.schemas) {
        throw new Error('No schemas configured in oolong config.');
    }
    
    let linker = new Linker(context);
    linker.link(schemaFile);

    let promises = [];

    _.forOwn(linker.schemas, (schema, schemaName) => {
        if (!(schemaName in oolongConfig.schemas)) {
            throw new Error('Schema "' + schemaName + '" not exist in oolong config.');
        }

        let schemaOolongConfig = oolongConfig.schemas[schemaName];
        let deployment = _.isArray(schemaOolongConfig.deployTo) ? schemaOolongConfig.deployTo : [ schemaOolongConfig.deployTo ];

        _.each(deployment, (dbServiceKey) => {
            let service = context.currentApp.getService(dbServiceKey);

            let Deployer = require(`./deployer/db/${service.dbmsType}.js`);
            let deployer = new Deployer(context, schemaName, service);
            
            promises.push(() => deployer.deploy(reset));
        });
    });    

    return Util.eachPromise(promises);
};

exports.import = function (appModule, context, schemaFile, mode) {
    let linker = new Linker(context);
    let schemaModule = linker.loadModule(schemaFile);

    let promises = [];

    _.forOwn(schemaModule.database, (db, dbName) => {
        let dataDir = path.join(appModule.backendPath, 'db', db.type, dbName, mode);
        let dataListFile = path.join(dataDir, 'index.list');

        if (!fs.existsSync(dataListFile)) {
            promises.push(Promise.reject(`Data entry list file "${dataListFile}" not found.`));
            return;
        }

        let dataList = S(fs.readFileSync(dataListFile)).lines();
        let dbDeployer = require(`./db/${db.type}.js`);

        _.each(dataList, line => {
            line = line.trim();

            if (line.length > 0) {
                let dataFile = path.join(dataDir, line);
                if (!fs.existsSync(dataFile)) {
                    promises.push(Promise.reject(`Data file "${dataFile}" not found.`));
                    return;
                }

                promises.push(dbDeployer.importData(appModule, context, dbName, db, dataFile));
            }
        });
    });

    return Promise.all(promises);
};
