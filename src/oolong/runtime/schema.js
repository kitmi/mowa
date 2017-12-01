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
     *
     * @example
     *  C:
     *    appModule.getSchema(name).createEntity(entityName)
     *  R:
     *    appModule.getSchema(name).getEntity(entityName, id)
     *    appModule.getSchema(name).lookUpEntity(entityName, {...})
     *  U:
     *    appModule.getSchema(name).updateEntity(entityName, id, {...})
     *    or
     *    let entity = appModule.getSchema(name).getEntity(entityName, id);
     *    entity.save();
     *  D:
     *    appModule.getSchema(name).deleteEntity(entityName, id);
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
     * 
     */
    getEntity() {
        
    }

    /**
     * Insert an entity record into the database
     * 
     * @param {Entity} entity - The entity to insert
     * @returns {Promise}
     */
    createEntity(entity) {
        
    }

    /**
     * Update an entity record
     * 
     * @param entity
     * @returns {Promise}
     */
    updateEntity(entityName, entityKey, contentToUpdate) {
        
    }

    /**
     * Delete entity by entity key
     * 
     * @param {string} entityName -
     * @param {object} entityKey -
     * @param {bool} [returnDeleted=false]
     */
    deleteEntity(entityName, entityKey, returnDeleted) {
        
    }
    
}

module.exports = Schema;