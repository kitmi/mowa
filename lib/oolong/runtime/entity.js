"use strict";

require('debug')('tracing')(__filename);

const path = require('path');
const Util = require('../../util.js');
const _ = Util._;

class Entity {
    /**
     * Entity object
     *
     * @constructs Entity
     * @param {Database} db - Database object
     *
     * @example <caption>Create a new entity</caption>
     * let db = appModule.getSchema('db_name');
     * let entity = db.newEntity('entity_name');
     * entity.name = 'Bob';
     * entity.gender = 'male';
     * entity.save().then(response => { });
     */
    constructor(db) {
        /**
         * Database object
         * @type {AppModule}
         * @protected
         **/
        this._db = db;

        /**
         * Flag of new entity
         * @type {boolean}
         * @protected
         */
        this._isNew = true;
    }

    /**
     * To find an entity by certain condition, can be an id value or query object
     *
     * @param {*} condition
     * returns {Promise}
     */
    static find(condition) {
        //to be implemented in subclass
    }

    /**
     * To remove an entity by certain condition
     *
     * @param condition
     * returns {Promise}
     */
    static remove(condition) {
        //to be implemented in subclass
    }

    /**
     * The identifier of this entity, can be an id value or unique combination values
     *
     * @member {*}
     */
    get identifier() {
        //to be implemented in subclass
    }

    /**
     * Save the entity status into database
     *
     * @returns {Promise}
     */
    save() {
        if (this._isNew) {
            this._db.insert(this);
        } else {
            this._db.update(this);
        }
    }

    /**
     * Erase the current entity from database
     *
     * returns {Promise}
     */
    erase() {
        this._db.remove(this);
    }
}

module.exports = Entity;