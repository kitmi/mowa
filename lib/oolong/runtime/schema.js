"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../../util.js');
const _ = Util._;

class Schema {
    /**
     * Database schema object
     *
     * @constructs Schema
     */
    constructor(appModule, name, dbms) {
        /**
         * Owner app module
         *
         * @type {AppModule}
         * @protected
         **/
        this._appModule = appModule;

        /**
         * Schema name
         *
         * @public
         */
        this.name = name;

        /**
         * Dbms name
         *
         * @public
         */
        this.dbms = dbms;
    }

    /**
     * Get an entity class by name
     *
     * @param {string} entityName
     * @returns {*}
     */
    getEntityClass(entityName) {
        let entityFile = path.join(this._appModule.modelsPath, this.name, entityName + '.js');
        return require(entityFile);
    }

    /**
     * Create an entity object
     *
     * @param {string} entityName
     * @returns {Entity}
     */
    newEntity(entityName) {
        let Entity = this.getEntityClass(entityName);
        return new Entity(this);
    }

    /**
     * 
     */
    select() {
        
    }

    /**
     * Insert an entity record into the database
     * 
     * @param {Entity} entity - The entity to insert
     * @returns {Promise}
     */
    insert(entity) {
        
    }

    /**
     * Update an entity record
     * 
     * @param entity
     * @returns {Promise}
     */
    update(entity) {
        
    }

    /**
     * 
     * 
     * @param entity
     */
    remove(entity) {
        
    }
    
}

module.exports = Schema;