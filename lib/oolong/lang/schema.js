"use strict";

const util = require('util');
const Entity = require('./entity');
const _ = require('lodash');
const Oolong = require('./oolong.js');
const OolUtils = require('./ool-utils.js');

class Schema {

    constructor(linker, name, oolModule, info) {        
        this.linker = linker;
        this.name = name;
        this.oolModule = oolModule;
        this.info = info;

        this.entities = {};
        this.entityIdMap = {};
        this.relations = undefined;
        this.deployments = undefined;

        this.inited = false;
    }

    clone(stack) {
        if (!stack) stack = new Map();
        let cl = new Schema(this.linker, this.name, this.oolModule, this.info);
        stack.set(this, cl);
        
        cl.entities = OolUtils.deepClone(this.entities, stack);
        cl.entityIdMap = OolUtils.deepClone(this.entityIdMap, stack);

        if (this.relations) {
            cl.relations = OolUtils.deepClone(this.relations, stack);
        }

        if (this.deployments) {
            cl.deployments = OolUtils.deepClone(this.deployments, stack);
        }

        cl.inited = this.inited;

        return cl;
    }

    init() {
        if (this.inited) {
            return;
        }

        this.linker.log('debug', 'Initializing schema [' + this.name + '] ...');

        //1st round, get direct output entities
        this.info.entities.forEach(entityEntry => {
            let entity = this.linker.loadEntity(this.oolModule, entityEntry.entity);

            let entityName = entityEntry.alias || entity.name;
            this.addEntity(entityName, entity);
        });

        if (this.info.deployments) {
            this.deployments = _.reduce(this.info.deployments, (result, dbName) => {
                result[dbName] = this.linker.databases[dbName];
                return result;
            }, {});
        }

        this.inited = true;

        return this;
    }
    
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

    hasEntityById(entityId) {
        return (entityId in this.entityIdMap);
    }

    hasEntity(entityName) {
        return (entityName in this.entityIdMap);
    }

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

    toJSON() {
        return {
            name: this.name,
            entities: _.reduce(this.entities, (r, v, k) => (r[k] = v.toJson(), r), {}),
            relations: this.relations,
            deployments: this.deployments
        };
    }
}

module.exports = Schema;