"use strict";

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;
const fs = Util.fs;
const Promise = Util.Promise;

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

    async deploy(reset) {
        let dbScriptDir = path.join(this.appModule.backendPath, Mowa.Literal.DB_SCRIPTS_PATH, this.dbService.dbType, this.dbService.name);        

        //remove db
        let realDbName = this.dbService.physicalDbName;        
        this.dbService.connectionComponents.pathname = '/';

        //enable multiple statement        
        this.dbService.connectionComponents.searchParams.set('multipleStatements', 1);
        this.dbService.connectionString = this.dbService.connectionComponents.href;
        
        let sqlFiles = [ 'entities.sql', 'relations.sql', 'procedures.sql' ];
        let dbConnection = await this.dbService.getConnection();
        let results;

        try {
            if (reset) {
                results = await dbConnection.query(`DROP DATABASE IF EXISTS ??; CREATE DATABASE ??`, [realDbName, realDbName]);
            } else {
                results = await dbConnection.query(`CREATE DATABASE IF NOT EXISTS ??`, [realDbName]);
            }

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

            results = await dbConnection.query('USE `' + realDbName + '`');

            await Util.eachAsync_(sqlFiles, async(file) => {

                let sqlFile = path.join(dbScriptDir, file);
                if (!fs.existsSync(sqlFile)) {
                    return Promise.reject(`Database script "${file}" found. Try run "mowa oolong build" first`);
                }

                let sql = _.trim(fs.readFileSync(sqlFile, { encoding: 'utf8' }));
                if (sql) {
                    let results = await dbConnection.query(sql);

                    let [ result, fields ] = results;

                    if (!_.isArray(result)) {
                        result = [result];
                    }

                    let warningRows = _.reduce(result, (sum, row) => {
                        sum += row.warningStatus;
                        return sum;
                    }, 0);

                    if (warningRows > 0) {
                        this.logger.log('warn', `${warningRows} warning(s) reported while running "${file}".`);
                    } else {
                        this.logger.log('info', `Database script "${realDbName}" run successfully.`);
                    }
                }
            });
        } finally {
            this.dbService.closeConnection(dbConnection);
        }
    }

    async loadData(dataFile) {
        let ext = path.extname(dataFile);
        let content = fs.readFileSync(dataFile, {encoding: 'utf8'});

        let db = this.appModule.db(this.dbService.serviceId);

        if (ext === '.json') {
            let data = JSON.parse(content);

            return Promise.resolve(Util.eachAsync_(data, async (records, entityName) => {

                let Model = db.model(entityName);

                let items = Array.isArray(records) ? records : [ records ];

                return Util.eachAsync_(items, async item => {
                    let model = new Model(item);
                    return model.save();
                });
            })).finally(() => {
                db.release();
            });
        } else if (ext === '.sql') {
            let conn = await db.conn_();
            let [ result ] = await conn.query(content);
            console.log(result);
            db.release();

        } else {
            throw new Error('Unsupported data file format.');
        }
    }
}

module.exports = MysqlDeployer;