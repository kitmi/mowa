"use strict";

const mysql = require('mysql2/promise');
const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;
const DbService = require('../dbservice.js');

const poolByConn = {};

class MysqlService extends DbService {
    constructor(name, options) {
        super('mysql', name, options);
    }

    getConnection(ctx, autoRelease) {
        if (autoRelease) {
            if (!ctx) {
                throw new Mowa.ServerError('"autoRelease" feature can only be used within a koa action.');
            }

            if (!('postActions' in ctx)) {
                throw new Mowa.ServerError('"postAction" middleware is required for autoRelease feature of MysqlService.');
            }
        }

        let pool = poolByConn[this.connectionString];

        if (!pool) {
            pool = poolByConn[this.connectionString] = mysql.createPool(this.connectionString);
        }

        if (autoRelease) {
            return pool.getConnection().then(conn => {
                ctx.postActions.push(() => Promise.resolve(conn.release()));
                return conn;
            });
        }

        return pool.getConnection();
    }

    closeConnection(ctx, conn) {
        conn.release();
    }
}

module.exports = {
    type: Mowa.Feature.DBMS,

    load_: function (appModule, dbs) {

        Util._.forOwn(dbs, (opt, db) => {
            if (!opt.connection) {
                throw new Mowa.Error.InvalidConfiguration('Missing connection string.', appModule, `mysql.${db}.connection`);
            }

            let service = new MysqlService(db, opt);
            appModule.registerService(service.serviceId, service);
        });

        return Promise.resolve();
    }
};