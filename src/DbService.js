"use strict";

const Util = require('./util.js');

class DbService {
    constructor(type, name, options) {
        this.type = type;
        this.name = name;
        this.serviceName = type + ':' + name;
        this.connectionString = options.connection;
        this.dbSpec = options.spec;
    }   
    
    getConnection(ctx, autoRelease) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }

    closeConnection(ctx, connnection) {
        throw new Error(Util.Message.DBC_NOT_IMPLEMENTED);
    }
}

module.exports = DbService;