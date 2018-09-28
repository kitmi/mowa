"use strict";

/**
 * @module Feature_Mongodb
 * @summary Enable mongodb access as a service
 */

const Mowa = require('mowa');
const Util = Mowa.Util;
const MongoClient = require('mongodb').MongoClient;
const DbService = require('mowa/lib/oolong/runtime/dbservice');

class MongodbService extends DbService {
    constructor(appModule, name, options) {
        super(appModule, 'mongodb', name, options);
    }

    async getConnection_() {
        return MongoClient.connect(opt.connection).then(client);
    }

    closeConnection(conn) {
        return conn.close();
    }

    async startTransaction_(conn) {   
        //unsupported feature, leave blank
    }

    async commitTransaction_(conn) {      
        //unsupported feature, leave blank
    }

    async rollbackTransaction_(conn) {
        //unsupported feature, leave blank
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
    load_: async function (appModule, dbs) {
        Util._.forOwn(dbs, (opt, db) => {
            if (!opt.connection) {
                //to be refined
                throw new Mowa.Error.InvalidConfiguration('Missing connection string.', appModule, `mongodb.${db}.connection`);
            }       

            let service = new MongodbService(appModule, db, opt);
            appModule.registerService(service.serviceId, service);
        });
    }
};