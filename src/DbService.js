"use strict";

const Util = require('./util.js');
const Promise = Util.Promise;

class DbService {
    /**
     * A database service object
     * @constructs DbService
     * @param {string} type - Dbms type
     * @param {string} name - The name of database
     * @param {object} [options] - Options loaded from feature config
     * @property {object} [options.spec] - Dbms specifications
     * @property {string} [options.connection] - The connection string
     */
    constructor(type, name, options) {
        this.dbmsType = type;
        this.dbmsSpec = options.spec;
        this.name = name;
        this.serviceId = type + ':' + name;
        this.connectionString = options.connection;
    }

    /**
     * Get a database connection
     * @memberof DbService
     * @param {object} [ctx]
     * @param {bool} [autoRelease=false]
     * @returns {Promise.<object>}
     */
    getConnection(ctx, autoRelease) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }

    /**
     * Close a database connection
     * @memberof DbService
     * @param {object} ctx
     * @param {object} connnection
     * @returns {Promise.<object>}
     */
    closeConnection(ctx, connnection) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }
}

module.exports = DbService;