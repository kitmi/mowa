"use strict";

/**
 * @module Feature_Mysql
 * @summary Enable mysql access as a service
 */

const mysql = require('mysql2/promise');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;
const DbService = require('../dbservice.js');

const poolByConn = {};

class MysqlService extends DbService {
    constructor(type, name, options) {
        super('mysql', name, options);
    }

    getConnection(ctx, autoRelease) {
        let pool = poolByConn[this.connectionString];

        if (!pool) {
            pool = poolByConn[this.connectionString] = mysql.createPool(this.connectionString);
        }

        if (autoRelease) {
            return pool.getConnection().then(conn => {
                appModule.once('actionCompleted', () => {
                    conn.release();
                });

                return Promise.resolve(conn);
            });
        }

        return pool.getConnection();
    }

    closeConnection(ctx, connnection) {
    }
}


module.exports = {
    /**
     * This feature is loaded at dbms stage
     * @member {string}
     */
    type: Mowa.Feature.DBMS,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} dbs - Mysql db and its setting
     * @returns {Promise.<*>}
     */
    load_: function (appModule, dbs) {

        Util._.forOwn(dbs, (opt, db) => {
            if (!opt.connection) {
                //to be refined
                throw new Mowa.Error.InvalidConfiguration('Missing connection string.', appModule, `mysql.${db}.connection`);
            }

            let serviceName = 'mysql:' + db;
            let service = {
                name: serviceName,
                dbmsType: 'mysql',
                dbmsSpec: opt.dbms,
                connectionString: opt.connection,                
                getConnection: autoRelease => {
                    

                    if (autoRelease) {
                        return pool.getConnection().then(conn => {
                            appModule.once('actionCompleted', () => {
                                conn.release();
                            });

                            return Promise.resolve(conn);
                        });
                    }

                    return pool.getConnection();
                }
            };

            appModule.registerService('mysql:' + db, service);
        });

        return Promise.resolve();
    }
};