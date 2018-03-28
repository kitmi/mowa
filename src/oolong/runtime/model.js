"use strict";

const Mowa = require('../../server.js');
const Util = Mowa.Util;
const _ = Util._;

const Errors = require('./errors.js');
const { ModelValidationError, ModelOperationError } = Errors;

const Generators = require('./generators.js');
const Validators = require('./validators.js');

class Model {
    /**
     * Flag to mark as new Entity
     * @type {boolean}
     */
    isNew = true;

    /**
     * Model operator, provide CRUD functions
     *      
     * @constructs Model
     * @param {Object} [rawData] - Mapped object
     */
    constructor(rawData) {
        if (rawData) {
            this.data = Model._filterNullValues(rawData);
        }

        this.appModule = this.db.appModule;
    }

    fromDb(data) {
        this.isNew = false;

        this.pendingUpdate = new Set();

        this.oldData = data;

        this.data = new Proxy(Object.assign({}, data), {
            set: (obj, prop, value) => {
                // Check whether it is a field of this model
                if (!(prop in this.meta.fields)) return true;

                obj[prop] = value;

                // The default behavior to store the value
                if (this.oldData[prop] != value) {
                    this.pendingUpdate.add(prop);
                } else {
                    this.pendingUpdate.delete(prop);
                }

                // Indicate success
                return true;
            }
        });

        return this;
    }

    get db() {
        return this.constructor.db;
    }

    get meta() {
        return this.constructor.meta;
    }

    async save() {
        if (this.isNew) {
            let context = await this._preCreate();
            if (context.errors.length > 0) {
                throw new ModelValidationError(context.errors);
            }

            if (!_.isEmpty(this.meta.atLeastOneNotNull)) {
                this.meta.atLeastOneNotNull.forEach(group => {
                    if (_.every(group, fieldName => _.isNil(context.latest[fieldName]))) {
                        throw new ModelValidationError({
                            fields: group.map(f => this.meta.fields[f]),
                            message: 'At least one of these fields should not be null.'
                        });
                    }
                });
            }
            
            return this._doCreate(context);
        } else {
            let context = await this._preUpdate();
            if (context.errors.length > 0) {
                throw new ModelValidationError(context.errors);
            }

            if (!_.isEmpty(this.meta.atLeastOneNotNull)) {
                this.meta.atLeastOneNotNull.forEach(group => {
                    if (_.every(group, fieldName => ((fieldName in context.latest) && _.isNil(context.latest[fieldName])) || (!(fieldName in context.latest) && _.isNil(context.existing[fieldName])))) {
                        throw new ModelValidationError({
                            fields: group.map(f => this.meta.fields[f]),
                            message: 'At least one of these fields should not be null.'
                        });
                    }
                });
            }

            return this._doUpdate(context);
        }
    }

    async _preCreate() {
        return this.constructor._rawDataPreProcess({ raw: this.data }, true);
    }

    async _preUpdate() {
        let raw = _.pick(this.data, Array.from(this.pendingUpdate));

        return this.constructor._rawDataPreProcess({ existing: this.oldData, raw, updating: this.pendingUpdate });
    }    
    
    static async _rawDataPreProcess(context, isNew = false) {
        let meta = this.meta;
        let fields = meta.fields;
        let { raw } = context;
        let errors = [];
        let latest = {};
        context.errors = errors;
        context.latest = latest;

        for (let fieldName in fields) {
            let fieldMeta = fields[fieldName];

            if (fieldName in raw) {
                //field value given in raw data
                if (fieldMeta.readOnly) {
                    //read only, not allow to set by input value
                    throw new ModelValidationError({
                        field: fieldMeta,
                        message: 'Read-only field is not allowed to be set by manual input.'
                    });
                } else if (!isNew && fieldMeta.fixedValue) {
                    //update a fixedValue field
                    if (!_.isNil(context.existing[fieldName])) {
                        throw new ModelValidationError({
                            field: fieldMeta,
                            message: 'Write-once-only field is not allowed to be update once it was set.'
                        });
                    }                                        
                } 
                
                //sanitize first
                let sanitizeState = Validators.$sanitize(fieldMeta, raw[fieldName]);
                if (sanitizeState.error) {
                    errors.push(sanitizeState.error);
                    return context;
                }

                latest[fieldName] = sanitizeState.sanitized;
                continue;                
            }

            //not given in raw data
            if (isNew) {
                if (!fieldMeta.defaultByDb) {
                    if ('default' in fieldMeta) {
                        //has default setting in meta data
                        latest[fieldName] = fieldMeta.default;
                    } else if (fieldMeta.auto) {
                        latest[fieldName] = Generators.generate(fieldMeta);
                    } else if (!fieldMeta.optional) {
                        errors.push({field: fieldMeta, message: 'Missing required field.'});
                        return context;
                    }
                }
            } else {
                if (fieldMeta.fixedValue && !_.isNil(context.existing[fieldName])) {
                    //already write once
                    continue;
                }

                if (fieldMeta.forceUpdate) {
                    if (fieldMeta.updateByDb) {
                        continue;
                    }

                    //add the field into updating list, may be filled by modifier
                    context.updating.add(fieldName);
                    //todo: update function support
                }
            }
        }        

        return context;
    }

    static _filterNullValues(condition) {
        let result = {};

        _.forOwn(condition, (value, key) => {
            if (!_.isNil(value)) {
                result[key] = value;
            }
        });

        return result;
    }

    static async findOne(condition) {        
        if (!_.isPlainObject(condition)) {
            if (_.isNil(condition)) {
                throw new Mowa.Error.InvalidRequest('Argument is null.');
            }

            //todo：combination key support 
            condition = { [ this.meta.keyField ]: condition };
        } else {
            // check whether contains unique field
            //todo: foreign entity joined query
            let containsUniqueKey = _.find(this.meta.uniqueKeys, fields => {
                let containsAll = true;
                fields.forEach(f => { if (!(f in condition)) containsAll = false; });
                return containsAll;
            });
            
            if (!containsUniqueKey) {
                throw new Mowa.Error.InvalidArgument('"findOne()" requires condition with unique keys.');
            }

            condition = Model._filterNullValues(condition);
        }

        let fields = Object.keys(this.meta.fields);
        let record = await this._doFindOne(_.pick(condition, fields));
        if (!record) return undefined;

        let Model = this;
        let model = new Model();

        return model.fromDb(record);
    }

    static async find(condition, fetchArray = false) {
        if (!_.isPlainObject(condition)) {
            throw new Mowa.Error.InvalidArgument('"find()" requires condition to be plain object.');
        }

        let fields = Object.keys(this.meta.fields);
        let records = await this._doFind(_.pick(Model._filterNullValues(condition), fields));
        if (!records) return undefined;

        if (fetchArray) return records;

        return records.map(row => {
            let model = new this.constructor();
            return model.fromDb(row);
        });
    }

    static async removeOne(condition) {
        if (!_.isPlainObject(condition)) {
            if (_.isNil(condition)) {
                throw new Mowa.Error.InvalidRequest('Argument is null.');
            }

            //todo：combination key support
            condition = { [ this.meta.keyField ]: condition };
        } else {
            // check whether contains unique field
            //todo: foreign entity joined query
            let containsUniqueKey = _.find(this.meta.uniqueKeys, fields => {
                let containsAll = true;
                fields.forEach(f => { if (!(f in condition)) containsAll = false; });
                return containsAll;
            });

            if (!containsUniqueKey) {
                throw new Mowa.Error.InvalidArgument('"removeOne()" requires condition with unique keys.');
            }

            condition = Model._filterNullValues(condition);
        }

        return await this._doRemoveOne(condition);
    }
}

module.exports = Model;