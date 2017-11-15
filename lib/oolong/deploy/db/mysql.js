"use strict";

const _ = require('lodash');
const URL = require('url');
const QS = require('querystring');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const co = require('co');

function deploy(appModule, context, dbName, dbConnectionKey, dbInfo, reset) {
    let { logger } = context;
    
    let dbScriptDir = appModule.toAbsolutePath(appModule.options.backendPath, 'db', 'mysql', dbName);

    let dbService = appModule.getService('mysql:' + dbConnectionKey);
    if (!dbService) {
        return Promise.reject(`"mysql:${dbConnectionKey}" service not found.`);
    }

    let connStr = dbService.connectionString;
    let connInfo = URL.parse(connStr);
    let connOpts = QS.parse(connInfo.query);

    //remove db
    let realDbName = connInfo.pathname.substr(1);
    connInfo.pathname = '/';

    //enable multiple statement
    connOpts.multipleStatements = 1;
    connInfo.query = QS.stringify(connOpts);

    dbService.connectionString =  URL.format(connInfo);

    let dbConnection, entitiesSqlFile;

    return dbService.getConnection().then(db => {
        dbConnection = db;

        if (reset) {
            return dbConnection.query(`DROP DATABASE IF EXISTS ??; CREATE DATABASE ??`, [ realDbName, realDbName ]);
        }

        return dbConnection.query(`CREATE DATABASE IF NOT EXISTS ??`, [ realDbName ]);
    }).then(result => {
        if (reset) {
            if (result[0].warningCount == 0 && result[0].affectedRows > 0) {
                logger.log('info', `Dropped database "${realDbName}".`);
            }

            if (result[1].warningCount == 0 && result[1].affectedRows == 1) {
                logger.log('info', `Created database "${realDbName}".`);
            }
        } else {
            if (result.warningCount == 0 && result.affectedRows == 1) {
                logger.log('info', `Created database "${realDbName}".`);
            }
        }

        entitiesSqlFile = path.join(dbScriptDir, 'entities.sql');
        if (!fs.existsSync(entitiesSqlFile)) {
            dbConnection.release();

            console.log(entitiesSqlFile);
            return Promise.reject('No database scripts found. Try run "mowa oolong build" first');
        }

        return dbConnection.query('USE ??', [ realDbName ]);
    }).then(() => {
        let sql = fs.readFileSync(entitiesSqlFile, { encoding: 'utf8' });
        return dbConnection.query(sql);
    }).then(result => {
        let warningRows = _.reduce(result, (result, row) => {
            result += row.warningCount;
            return result;
        }, 0);
        if (warningRows > 0) {
            logger.log('warn', `${warningRows} warning(s) reported while initializing the database structure.`);
        }

        logger.log('info', `The table structure of database "${realDbName}" is created.`);

        dbConnection.release();

        return Promise.resolve();
    });
}

function checkInsertResult(logger, result) {
    console.log(result);
}

class ActionContext {
    constructor(appModule) {
        this.appModule = appModule;

        let i18n = appModule.getService('i18n');
        if (i18n) {
            this.__ = i18n.getI18n();
        }
    }
}

function importData(appModule, context, dbName, dbInfo, dataFile) {
    let { logger } = context;

    let ext = path.extname(dataFile);
    let content = fs.readFileSync(dataFile, {encoding: 'utf8'});

    if (ext == '.json') {
        let data = JSON.parse(content);
        let querys = [];
        let ctx = new ActionContext(appModule);

        _.forOwn(data, (records, tableName) => {
            console.log(dbName + '.' + tableName);
            let model = appModule.getModel(dbName + '.' + tableName);

            _.each(records, record => {
                querys.push(co(model.create.bind(ctx)(record)));
            });
        });

        return Promise.all(querys);
    } else if (ext == '.sql') {
        let dbService = appModule.getService('mysql:' + dbName);
        if (!dbService) {
            return Promise.reject(`"mysql:${dbName}" service not found.`);
        }

        //make sure multipleStatements is enabled
        let connStr = dbService.connectionString;
        let connInfo = URL.parse(connStr);
        let connOpts = QS.parse(connInfo.query);
        connOpts.multipleStatements = 1;
        connInfo.query = QS.stringify(connOpts);
        dbService.connectionString = URL.format(connInfo);

        let dbConnection;

        return dbService.getConnection().then(db => {
            dbConnection = db;
            return dbConnection.query(content);
        }).then(result => {
            if (Array.isArray(result)) {
                _.each(result, r => checkInsertResult(logger, r));
            } else {
                checkInsertResult(logger, result);
            }

            dbConnection.release();

            return Promise.resolve();
        });

    } else {
        throw new Error('Unsupported data file format.');
    }
}

module.exports = {
    deploy,
    importData
};