"use strict";

const inflection = require('inflection');
const _ = require('lodash');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const OolUtils = require('./ool-utils.js');
const Util = require('../../util.js');

class Entity {

    constructor(linker, name, oolModule, info) {
        this.events = new EventEmitter();

        //immutable        
        this.linker = linker;        
        this.name = name;
        this.oolModule = oolModule;
        this.info = info;    
        this.id = oolModule.id + ':' + name;

        //predefined properties
        this.fields = {};

        this.features = undefined;
        this.key = undefined;
        this.relations = undefined;
        this.indexes = undefined;
        this.isRelationshipEntity = false;
        this.dbFeatures = undefined;
        this.extraValidationRules = undefined;
        this.modelingFlags = undefined;
        this.fieldValidators = undefined;
        this.fieldModifiers = undefined;
        this.interfaces = undefined;
        
        this.inited = false;        
    }

    on(eventName, listener) {
        return this.events.on(eventName, listener);
    }

    clone(stack) {
        if (!stack) stack = new Map();
        let cl = new Entity(this.linker, this.name, this.oolModule, this.info);
        stack.set(this, cl);

        cl.fields = OolUtils.deepClone(this.fields, stack);
        OolUtils.deepCloneField(this, cl, 'features', stack);
        OolUtils.deepCloneField(this, cl, 'key', stack);
        OolUtils.deepCloneField(this, cl, 'relations', stack);
        OolUtils.deepCloneField(this, cl, 'indexes', stack);
        OolUtils.deepCloneField(this, cl, 'dbFeatures', stack);
        OolUtils.deepCloneField(this, cl, 'extraValidationRules', stack);
        OolUtils.deepCloneField(this, cl, 'modelingFlags', stack);
        OolUtils.deepCloneField(this, cl, 'fieldValidators', stack);
        OolUtils.deepCloneField(this, cl, 'fieldModifiers', stack);
        OolUtils.deepCloneField(this, cl, 'interfaces', stack);

        if (this.isRelationshipEntity) cl.isRelationshipEntity = true;

        cl.inited = this.inited;

        return cl;
    }

    inherit(baseEntity) {
        if (!baseEntity.inited) {
            throw new Error('Extend from an uninitialized entity!');
        }

        let stack = new Map();

        this.fields = OolUtils.deepClone(baseEntity.fields, stack);        

        if (baseEntity.features) {
            this.features = OolUtils.deepClone(baseEntity.features, stack);
        }

        if (baseEntity.key) {
            this.key = OolUtils.deepClone(baseEntity.key, stack);
        }

        if (baseEntity.indexes) {
            this.indexes = OolUtils.deepClone(baseEntity.indexes, stack);
        }
    }   

    init() {
        if (this.inited) {
            return;
        }

        this.linker.log('debug', 'Initializing entity [' + this.name + '] ...');

        if (this.info.base) {
            //inherit
            let baseEntity = this.linker.loadEntity(this.oolModule, this.info.base);
            this.inherit(baseEntity);
        }

        // load features
        if (this.info.features) {
            this.info.features.forEach(feature => {
                let featureName, featureOptions;
                if (_.isPlainObject(feature) && feature.type == 'FunctionCall') {
                    featureName = feature.name;
                    let args = OolUtils.translateOolObj(feature.arguments);
                    featureOptions = args.length == 1 ? args[0] : args;
                } else {
                    featureName = feature;
                }

                let fn = require(path.resolve(__dirname, `./features/${featureName}.js`));
                fn(this, featureOptions);
            });
        }

        this.events.emit('beforeFields');

        // process fields
        if (this.info.fields) {
            _.each(this.info.fields, (fieldInfo, fieldName) => {
                this.addField(fieldName, fieldInfo);
            });
        }

        this.events.emit('afterFields');

        if (this.info.indexes) {
            _.each(this.info.indexes, index => {
                this.addIndex(index);
            });
        }

        if (this.info.interface) {
            this.interfaces = this.info.interface;
        }

        this.inited = true;

        return this;
    }
    
    markAsRelationshipEntity() {
        this.isRelationshipEntity = true;
    }

    hasIndex(fields) {
        fields = fields.concat();
        fields.sort();

        return _.findIndex(this.indexes, index => {
                return _.findIndex(index.fields, (f, idx) => (fields.length <= idx || fields[idx] !== f)) === -1;
            }) != -1;
    }
    
    addIndex(index) {
        if (!this.indexes) {
            this.indexes = [];
        }

        index = OolUtils.deepClone(index);

        if (index.fields) {
            index.fields = _.map(OolUtils.translateOolObj(index.fields), field => {

                let normalizedField = inflection.camelize(field, true);

                if (!this.hasField(normalizedField)) {

                    throw new Error(`Index references non-exist field: ${field}, entity: ${this.name}.`);
                }

                return normalizedField;
            });

            index.fields.sort();

            if (this.hasIndex(index.fields)) {
                throw new Error(`Index on [${index.fields.join(', ')}] already exist in entity [${this.name}].`);
            }

            this.indexes.push(index);
        } else {
            console.log(index);
            throw new Error('error');
        }
    }    

    hasField(name) {
        return name in this.fields;
    }

    addField(name, info) {
        name = inflection.camelize(name, true);
        
        if (this.hasField(name)) {
            throw new Error(`Field name [${name}] conflicts in entity [${this.name}].`);
        }

        if (info.type) {
            info = Object.assign({}, this.linker.trackBackType(this.oolModule, info));
            
            if (info.validators) {
                this.fieldValidators || (this.fieldValidators = {});
                this.fieldValidators[name] = info.validators.map(v => (typeof v === 'string') ? { name: v } : { name: v.name, arguments: v.arguments } );
                delete info.validators;
            }

            if (info.modifiers) {
                this.fieldModifiers || (this.fieldModifiers = {});
                this.fieldModifiers[name] = info.modifiers.map(m => (typeof m === 'string') ? { name: v } : { name: m.name, arguments: m.arguments });
                delete info.modifiers;
            }

            if (info.generator) {
                if ('default' in info) {
                    throw new Error('Generator cannot be set for a field with default value.');
                }
                info.default = { type: 'Generator' };
            }

            if (info.type === 'enum') {
                info.values = OolUtils.translateOolObj(info.values);
            }

            this.fields[name] = info;

            if (!this.key) {
                this.key = name;
            }
        } else {
            //relation field
            if (!info.belongTo && !info.bindTo) {
                throw new Error(`Invalid field info of [${name}].`);
            }

            if (!this.oolModule.relation) {
                this.oolModule.relation = [];
            }

            let relationship, right;

            if (info.belongTo) {
                relationship = 'n:1';
                right = info.belongTo;
            } else {
                relationship = 'n:1';
                right = info.bindTo;
            }

            let relation = {
                left: this.name,
                right,
                relationship
            };

            if (info.optional) {
                relation.optional = true;
            }

            this.oolModule.relation.push(relation);
        }

        return this;
    }

    setFieldInfo(name, info) {
        this.fields[name] = Object.assign(this.fields[name], info);

        return this;
    }

    addDbFeature(feature) {
        Util.contract(() => feature.name);

        if (!this.dbFeatures) {
            this.dbFeatures = {};
        } else {
            Util.contract(() => !(feature.name in this.dbFeatures));
        }

        this.dbFeatures[feature.name] = feature;
        return this;
    }
    
    addValidationRule(rule) {
        if (!this.extraValidationRules) {
            this.extraValidationRules = [ rule ];
        } else {
            this.extraValidationRules.push(rule);
        }
        return this;
    }

    setModelingFlag(flag) {
        this.modelingFlags || (this.modelingFlags = {});
        Util.contract(() => !(flag in this.modelingFlags), `Duplicate modeling flag set for [${flag}].`);

        this.modelingFlags[flag] = true;
        return this;
    }

    setKey(name) {
        this.key = name;
        return this;
    }

    getKeyTypeInfo() {
        return this.fields[this.key];
    }

    addRelation(to, info) {
        if (!this.relations) {
            this.relations = {};
        }

        this.relations[to] = info;

        return this;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            fields: this.fields,
            key: this.key,
            features: this.features,
            indexes: this.indexes,
            relations: this.relations,
            dbFeatures: this.dbFeatures,
            modelingFlags: this.modelingFlags,
            extraValidationRules: this.extraValidationRules,
            fieldValidators: this.fieldValidators,
            fieldModifiers: this.fieldModifiers,
            isRelationshipEntity: this.isRelationshipEntity
        };
    }
}

module.exports = Entity;