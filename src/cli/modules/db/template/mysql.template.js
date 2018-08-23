"use strict";

/**
 * @module Feature_Mysql
 * @summary Enable mysql access as a service
 */

const mysql = require('mysql2/promise');
const Mowa = require('mowa');
const Util = Mowa.Util;
const Promise = Util.Promise;
const DbService = require('mowa/oolong/runtime/dbservice.js');

const poolByConn = {};

class MysqlService extends DbService {
    constructor(appModule, name, options) {
        super(appModule, 'mysql', name, options);
    }

    async getConnection() {
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

            let service = new MysqlService(appModule, db, opt);
            appModule.registerService(service.serviceId, service);
        });

        return Promise.resolve();
    }
};