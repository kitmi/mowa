"use strict";

const Util = require('./util.js');
const Mowa = require('./server.js');

class DbService {
    /**
     * A database service object
     * @constructs DbService
     * @param {AppModule} appModule - The app which creates this service
     * @param {string} type - Dbms type
     * @param {string} name - The name of database
     * @param {object} [options] - Options loaded from feature config
     * @property {object} [options.spec] - Dbms specifications
     * @property {string} [options.connection] - The connection string
     */
    constructor(appModule, type, name, options) {
        this.appModule = appModule;
        this.dbType = type;
        this.dbmsSpec = options.spec;
        this.name = name;
        this.serviceId = type + ':' + name;
        this.connectionString = options.connection;
        this.schemaName = options.schema;
    }

    /**
     * Get a database connection
     * @memberof DbService
     * @param {Object} [options] - Extra options for the connection, optional
     * @returns {Promise.<object>}
     */
    async getConnection(options) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }

    /**
     * Close a database connection
     * @memberof DbService
     * @param {Object} conn
     */
    closeConnection(conn) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }
}

module.exports = DbService;
