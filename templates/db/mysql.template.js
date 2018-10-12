"use strict";

/**
 * @module Feature_Mysql
 * @summary Enable mysql access as a service
 */

const mysql = require('mysql2/promise');
const Mowa = require('mowa');
const Util = Mowa.Util;
const Feature = require('mowa/lib/enum/feature');
const DbService = require('mowa/lib/oolong/runtime/dbservice');

const poolByConn = {};

class MysqlService extends DbService {
    constructor(appModule, name, options) {
        super(appModule, 'mysql', name, options);
    }

    async getConnection_() {
        let pool = poolByConn[this.connectionString];

        if (!pool) {
            pool = poolByConn[this.connectionString] = mysql.createPool(this.connectionString);

            this.appModule.serverModule.on('stopping', () => {
                pool.end();
            });
        }        

        return pool.getConnection();
    }

    closeConnection(conn) {
        return conn.release();
    }

    getViewSPName(viewName) {
        return 'sp_get_' + viewName; 
    }

    async startTransaction_(conn) {   
        let [ result ] = await conn.query('START TRANSACTION;');
        console.log(result);
    }

    async commitTransaction_(conn) {      
        let [ result ] = await conn.query('COMMIT;');
        return result;
    }

    async rollbackTransaction_(conn) {
        let [ result ] = await conn.query('ROLLBACK;');
        return result;
    }
}

module.exports = {
    /**
     * This feature is loaded at dbms stage
     * @member {string}
     */
    type: Feature.DBMS,

    /**
     * Load the feature
     * @param {AppModule} appModule - The app module object
     * @param {object} dbs - Mysql db and its setting
     * @returns {Promise.<*>}
     */
    load_: async function (appModule, dbs) {
        Util._.forOwn(dbs, (opt, db) => {
            if (!opt.connection) {
                //to be refined
                throw new Mowa.Error.InvalidConfiguration('Missing connection string.', appModule, `mysql.${db}.connection`);
            }

            let service = new MysqlService(appModule, db, opt);
            appModule.registerService(service.serviceId, service);
        });
    }
};