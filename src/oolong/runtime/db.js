"use strict";

const Mowa = require('../../server.js');

class Db {
    /**
     * Database object
     *
     * @constructs Db
     * @param {AppModule} appModule
     * @param {string} dbServiceId
     * @param {*} ctx
     */
    constructor(appModule, dbServiceId, ctx) {
        /**
         * Owner app module
         *
         * @type {AppModule}
         * @protected
         **/
        this.appModule = appModule;

        let [ dbType, dbName ] = dbServiceId.split(':');

        /**
         * Db name
         *
         * @public
         */
        this.name = dbName;

        /**
         * Db type
         *
         * @public
         */
        this.dbType = dbType;

        /**
         * Service id
         * 
         * @public
         */
        this.serviceId = dbServiceId;
        
        if (ctx) {
            //auto destruct if ctx given            
            if (!('postActions' in ctx)) {
                throw new Mowa.Error.ServerError('"postActions" middleware is required for auto-close feature of database connection.');
            }
            
            /**
             * Request context
             *
             * @public
             */
            this.ctx = ctx;    
        }        
    }

    /**
     * Get the database service object
     * @returns {*|Object}
     */
    get service() {
        return this.appModule.getService(this.serviceId);
    }

    /**
     * Get the database connection     
     * @returns {*|Promise.<Object>}
     */
    async conn_() {
        if (!this._conn) {
            this._conn = await this.service.getConnection();
            if (this.ctx) {
                this.ctx.postActions.push(() => {
                    this.service.closeConnection(this._conn);
                    delete this._conn;
                    delete this.ctx;
                });
            }
        }

        return this._conn;
    }

    /**
     * Release the database connection
     * @returns {Db}
     */
    release() {
        if (this._conn) {
            this.service.closeConnection(this._conn);
            delete this._conn;
        }

        return this;
    }
}

module.exports = Db;