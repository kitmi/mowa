"use strict";

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;
const fs = Util.fs;

const URL = require('url');
const QS = require('querystring');
const path = require('path');

const OolongDbDeployer = require('../db.js');

function checkInsertResult(logger, result) {
    console.log(result);
}

class MysqlDeployer extends OolongDbDeployer {
    /**
     * Oolong mysql deployer
     * @constructs OolongMysqlDeployer
     * @param {object} context
     * @param {object} dbService
     */
    constructor(context, dbService) {
        super(context, dbService);
    }

    deploy(reset) {
        let dbScriptDir = path.join(this.appModule.backendPath, Mowa.Literal.DB_SCRIPTS_PATH, this.dbService.dbType, this.dbService.name);

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
                this.dbService.closeConnection(dbConnection);
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

            this.dbService.closeConnection(dbConnection);
        }).catch(err => {
            if (dbConnection) {
                this.dbService.closeConnection(dbConnection);
            }

            throw err;
        });
    }

    async loadData(dataFile) {
        let ext = path.extname(dataFile);
        let content = fs.readFileSync(dataFile, {encoding: 'utf8'});

        let db = this.appModule.db(this.dbService.serviceId);

        if (ext == '.json') {
            let data = JSON.parse(content);
            let querys = [];

            return Util.eachAsync_(data, async (records, entityName) => {

                let Model = db.model(entityName);

                let items = Array.isArray(records) ? records : [ records ];

                return Util.eachAsync_(items, async item => {
                    let model = new Model(item);
                    return model.save();
                });
            });
        } else if (ext == '.sql') {
            /*
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

                dbConnection.closeConnection();

                return Promise.resolve();
            });
            */

        } else {
            throw new Error('Unsupported data file format.');
        }
    }
}

module.exports = MysqlDeployer;