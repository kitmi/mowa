"use strict";

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;
const fs = Util.fs;

const URL = require('url');
const QS = require('querystring');
const path = require('path');

const OolongDbDeployer = require('../db.js');

class ActionContext {
    constructor(appModule) {
        this.appModule = appModule;

        let i18n = appModule.getService('i18n');
        if (i18n) {
            this.__ = i18n.getI18n();
        }
    }
}

function checkInsertResult(logger, result) {
    console.log(result);
}

class MysqlDeployer extends OolongDbDeployer {
    /**
     * Oolong mysql deployer
     * @constructs OolongMysqlDeployer
     * @param {object} context
     * @param {string} schemaName
     * @param {object} dbService
     */
    constructor(context, schemaName, dbService) {
        super(context, schemaName, dbService);
    }

    deploy(reset) {
        let dbScriptDir = path.join(this.appModule.backendPath, Mowa.Literal.DB_SCRIPTS_PATH, 'mysql', this.schemaName);

        let connStr = this.dbService.connectionString;
        let connInfo = URL.parse(connStr);
        let connOpts = QS.parse(connInfo.query);

        //remove db
        let realDbName = connInfo.pathname.substr(1);
        connInfo.pathname = '/';

        //enable multiple statement
        connOpts.multipleStatements = 1;
        connInfo.query = QS.stringify(connOpts);

        this.dbService.connectionString = URL.format(connInfo);

        let dbConnection, entitiesSqlFile;

        return this.dbService.getConnection().then(db => {
            dbConnection = db;

            if (reset) {
                return dbConnection.query(`DROP DATABASE IF EXISTS ??; CREATE DATABASE ??`, [ realDbName, realDbName ]);
            }

            return dbConnection.query(`CREATE DATABASE IF NOT EXISTS ??`, [ realDbName ]);
        }).then(results => {
            let [ result, fields ] = results;

            if (reset) {
                if (result[0].warningStatus == 0 && result[0].affectedRows > 0) {
                    this.logger.log('info', `Dropped database "${realDbName}".`);
                }

                if (result[1].warningStatus == 0 && result[1].affectedRows == 1) {
                    this.logger.log('info', `Created database "${realDbName}".`);
                }
            } else {
                if (result.warningStatus == 0) {
                    this.logger.log('info', `Created database "${realDbName}".`);
                } else {
                    this.logger.log('warn', `Database "${realDbName}" exists.`);
                }
            }

            entitiesSqlFile = path.join(dbScriptDir, 'entities.sql');
            if (!fs.existsSync(entitiesSqlFile)) {
                dbConnection.release();
                return Promise.reject('No database scripts found. Try run "mowa oolong build" first');
            }

            return dbConnection.query('USE ??', [ realDbName ]);
        }).then(results => {
            let [ result, fields ] = results;

            let sql = fs.readFileSync(entitiesSqlFile, { encoding: 'utf8' });
            return dbConnection.query(sql);
        }).then(results => {
            let [ result, fields ] = results;

            if (!_.isArray(result)) {
                result = [ result ];
            }

            let warningRows = _.reduce(result, (sum, row) => {
                sum += row.warningStatus;
                return sum;
            }, 0);

            if (warningRows > 0) {
                this.logger.log('warn', `${warningRows} warning(s) reported while initializing the database structure.`);
            } else {
                this.logger.log('info', `The table structure of database "${realDbName}" is created.`);
            }

            dbConnection.release();
        });
    }

    loadData(dataFile) {
        let { logger, currentApp } = context;

        let ext = path.extname(dataFile);
        let content = fs.readFileSync(dataFile, {encoding: 'utf8'});

        if (ext == '.json') {
            let data = JSON.parse(content);
            let querys = [];
            let ctx = new ActionContext(currentApp);

            _.forOwn(data, (records, tableName) => {
                console.log(dbName + '.' + tableName);
                let model = currentApp.getModel(dbName + '.' + tableName);

                _.each(records, record => {
                    querys.push(co(model.create.bind(ctx)(record)));
                });
            });

            return Promise.all(querys);
        } else if (ext == '.sql') {
            let dbService = currentApp.getService('mysql:' + dbName);
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
}

module.exports = MysqlDeployer;