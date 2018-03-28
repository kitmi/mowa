"use strict";

const Util = require('../../util.js');
const _ = Util._;

const Entity = require('./entity.js');
const Oolong = require('./oolong.js');
const OolUtils = require('./ool-utils.js');

class OolongSchema {
    /**
     * Oolong schema
     * @constructs OolongSchema
     * @param {OolongLinker} linker
     * @param {*} oolModule
     */
    constructor(linker, oolModule) {
        /**
         * Linker to process this schema
         * @type {OolongLinker}
         * @public
         */
        this.linker = linker;

        /**
         * Name of this entity
         * @type {string}
         * @public
         */
        this.name = oolModule.name;

        /**
         * Owner oolong module
         * @type {*}
         * @public
         */
        this.oolModule = oolModule;

        /**
         * Raw metadata
         * @type {object}
         * @public
         */
        this.info = oolModule.schema;

        /**
         * Entities in this schema
         * @type {object}
         * @public
         */
        this.entities = {};

        /**
         * Entities id mapping table
         * @type {object}
         * @public
         */
        this.entityIdMap = {};

        /**
         * Relations in this schema
         * @type {array}
         * @public
         * @example
         *  [ { left, right, optional, size, relationship, type, multi } ]
         */
        this.relations = undefined;

        /**
         * Flag of initialization
         * @type {boolean}
         * @public
         */
        this.initialized = false;
    }

    /**
     * Clone the schema
     * @param {Map} [stack] - Reference stack to avoid recurrence copy
     * @returns {OolongSchema}
     */
    clone(stack) {
        if (!stack) stack = new Map();
        let cl = new OolongSchema(this.linker, this.oolModule);
        stack.set(this, cl);
        
        cl.entities = OolUtils.deepClone(this.entities, stack);
        cl.entityIdMap = OolUtils.deepClone(this.entityIdMap, stack);

        if (this.relations) {
            cl.relations = OolUtils.deepClone(this.relations, stack);
        }

        cl.initialized = this.initialized;

        return cl;
    }

    /**
     * Start linking this schema
     * @returns {OolongSchema}
     */
    link() {
        if (this.initialized) {
            return this;
        }

        this.linker.log('debug', 'Initializing schema [' + this.name + '] ...');

        //1st round, get direct output entities
        this.info.entities.forEach(entityEntry => {
            let entity = this.linker.loadEntity(this.oolModule, entityEntry.entity);

            let entityInstanceName = entityEntry.alias || entity.name;
            this.addEntity(entityInstanceName, entity);
        });

        this.initialized = true;

        return this;
    }

    /**
     * Add relation into this schema
     * @param {object} relation
     * @returns {OolongSchema}
     */
    addRelation(relation) {
        if (!this.relations) {
            this.relations = [];
        }

        if (!this.hasEntityById(relation.left.id)) {
            this.addEntity(relation.left.name, relation.left);
        }

        if (!this.hasEntityById(relation.right.id)) {
            this.addEntity(relation.right.name, relation.right);
        }

        let leftName = this.entityIdMap[relation.left.id];
        let rightName = this.entityIdMap[relation.right.id];

        let r = Object.assign({}, relation, { left: leftName, right: rightName });

        this.relations.push(r);

        return this;
    }

    /**
     * Check whether a entity with given id is in the schema
     * @param {string} entityId
     * @returns {boolean}
     */
    hasEntityById(entityId) {
        return (entityId in this.entityIdMap);
    }

    /**
     * Check whether a entity with given name is in the schema
     * @param {string} entityName
     * @returns {boolean}
     */
    hasEntity(entityName) {
        return (entityName in this.entityIdMap);
    }

    /**
     * Add an entity into the schema
     * @param {string} name
     * @param {OolongEntity} entity
     * @returns {OolongSchema}
     */
    addEntity(name, entity) {
        if (this.hasEntity(name)) {
            throw new Error(`Entity name [${name}] conflicts in schema [${this.name}].`);
        }

        if (this.hasEntityById(entity.id)) {
            throw new Error(`Entity [${entity.id}] already exists in schema [${this.name}].`);
        }

        this.entities[name] = entity;
        this.entityIdMap[entity.id] = name;

        return this;
    }

    /**
     * Translate the schema into a plain JSON object
     * @returns {object}
     */
    toJSON() {
        return {
            name: this.name,
            entities: _.reduce(this.entities, (r, v, k) => (r[k] = v.toJSON(), r), {}),
            relations: this.relations,
            deployments: this.deployments
        };
    }
}

module.exports = OolongSchema;