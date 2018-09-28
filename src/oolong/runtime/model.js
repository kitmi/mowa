"use strict";

const Mowa = require('../../server.js');
const Util = Mowa.Util;
const _ = Util._;
const OolUtil = require('../lang/ool-utils.js');

const { Errors, Validators, Generators, Features } = require('.');
const { ModelValidationError, ModelOperationError } = Errors;


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
            this.data = this.constructor._filterCondition(rawData);
        }

        this.appModule = this.db.appModule;
    }

    /**
     * Populate data from database
     * @param {*} data 
     */
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

    get keyName() {
        return this.meta.keyField;
    }

    get keyValue() {
        return this.data[this.keyName];
    }

    async save({ ignoreDuplicate, retrieveSaved }) {
        if (this.isNew) {
            let context = await this.constructor._preCreate(this.data);
            if (context.errors.length > 0) {
                throw new ModelValidationError(context.errors);
            }

            OolUtil.applyFeature(OolUtil.RULE_POST_CREATE_CHECK, this.meta, context, this.db);
            
            return this._doCreate(context, ignoreDuplicate, retrieveSaved);
        } else {
            let context = await this.constructor._preUpdate(this.oldData, _.pick(this.data, Array.from(this.pendingUpdate)));
            if (context.errors.length > 0) {
                throw new ModelValidationError(context.errors);
            }

            OolUtil.applyFeature(OolUtil.RULE_POST_UPDATE_CHECK, this.meta, context, this.db);

            return this._doUpdate(context, retrieveSaved);
        }
    }    
    
    /**
     * Find one record, returns a model object containing the record or undefined if nothing found.
     * @param {*} condition - Primary key value or query condition with unique key values.
     * @returns {*}
     */
    static async findOne(condition) {     
        pre: !_.isNil(condition), '"findOne()" requires condition to be not null.';

        if (!_.isPlainObject(condition)) {
            //todo：combination key support 
            condition = { [ this.meta.keyField ]: condition };
        } else {
            // check whether contains unique field
            //todo: foreign entity joined query
            condition = this._ensureContainsUniqueKey(condition);                   
        }

        let record = await this._doFindOne(condition);
        if (!record) return undefined;

        let ModelClass = this;
        let model = new ModelClass();

        return model.fromDb(record);
    }

    /**
     * Find records matching the condition, returns an array of model object or an array of records directly if fetchArray = true.
     * @param {object|array} condition - Query condition, key-value pair will be joined with 'AND', array element will be joined with 'OR'.
     * @param {boolean} [fetchArray=false] - When fetchArray = true, the result will be returned directly without creating model objects.
     * @returns {array}
     */
    static async find(condition, fetchArray = false) {
        pre: _.isPlainObject(condition) || Array.isArray(condition), '"find()" requires condition to be a plain object or an array.';

        let records = await this._doFind(this._filterCondition(condition));
        if (!records) return undefined;

        if (fetchArray) return records;

        let ModelClass = this;

        return records.map(row => {
            let model = new ModelClass();
            return model.fromDb(row);
        });
    }

    /**
     * Create a new entity with given data
     * @param {object} data - Entity data 
     * @param {object} [options] - Create options
     * @property {bool} options.ignoreDuplicate - Ignore duplicate error
     * @property {bool} options.retrieveFromDb - Retrieve the created entity from database
     * @returns {object}
     */
    static async create(data, options) {
        let context = await this._preCreate(data);
        if (context.errors.length > 0) {
            throw new ModelValidationError(context.errors);
        }

        OolUtil.applyFeature(OolUtil.RULE_POST_CREATE_CHECK, this.meta, context, this.db);
        
        return this._doCreate(context, options);
    }

    /**
     * Update a new entity with given data
     * @param {object} data - Entity data with at least one unique key (pair) given
     * @param {object} [options] - Update options
     * @property {bool} [options.throwZeroUpdate=false] - Throw error if no row is updated
     * @property {bool} [options.retrieveFromDb=false] - Retrieve the updated entity from database
     * @returns {object}
     */
    static async update(data, options) {


        let context = await this.constructor._preUpdate(this.oldData, _.pick(this.data, Array.from(this.pendingUpdate)));
            if (context.errors.length > 0) {
                throw new ModelValidationError(context.errors);
            }

            OolUtil.applyFeature(OolUtil.RULE_POST_UPDATE_CHECK, this.meta, context, this.db);

            return this._doUpdate(context, retrieveSaved);
    }

    /**
     * Find a record or create a new one if not exist.
     * @param {*} condition 
     * @param {object} data 
     * @returns {Model}
     */
    static async findOrCreate(condition, data) {
        let record = this.findOne(condition);
        if (record) return record;


    }

    /**
     * Remove one record.
     * @param {*} condition 
     */
    static async removeOne(condition) {
        pre: !_.isNil(condition), '"removeOne()" requires condition to be not null.';

        if (!_.isPlainObject(condition)) {
            //todo：combination key support
            condition = { [ this.meta.keyField ]: condition };
        } else {
            // check whether contains unique field
            //todo: foreign entity joined query
            condition = this._ensureContainsUniqueKey(condition);                   
        }        
        
        return await this._doRemoveOne(condition);
    }

    static _ensureContainsUniqueKey(condition) {
        condition = this._filterCondition(condition, true);
        let containsUniqueKey = _.find(this.meta.uniqueKeys, fields => {
            let containsAll = true;
            fields.forEach(f => {
            if (_.isNil(condition[f]))
                containsAll = false;
            });
            return containsAll;
        });
        if (!containsUniqueKey) {
            throw new Mowa.Error.InvalidArgument('Single record operation requires condition to be containing unique key.');
        }
        return condition;
    }

    static _getUniqueKeyPairFrom(condition) {        
        return _.find(this.meta.uniqueKeys, fields => {
            let containsAll = true;
            fields.forEach(f => {
            if (_.isNil(condition[f]))
                containsAll = false;
            });
            return containsAll;
        });
    }

    static async _preCreate(data) {
        return this._rawDataPreProcess({ raw: data }, true);
    }

    static async _preUpdate(oldData, newData) {
        return this._rawDataPreProcess({ existing: oldData, raw: newData });
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
                        latest[fieldName] = Generators.$auto(fieldMeta, (this.db.ctx && this.db.ctx.__) || this.db.appModule.__);
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
                    //has force update policy, e.g. updateTimestamp
                    if (fieldMeta.updateByDb) {
                        continue;
                    }

                    //require generator to refresh auto generated value
                    if (fieldMeta.auto) {
                        latest[fieldName] = Generators.$auto(fieldMeta, (this.db.ctx && this.db.ctx.__) || this.db.appModule.__);
                        continue;
                    } 

                    throw new ModelOperationError('Unknow force update rule.', fieldName);          
                }
            }
        }

        OolUtil.applyFeature(OolUtil.RULE_POST_RAW_DATA_PRE_PROCESS, meta, context, this.db);

        return context;
    }

    /**
     * Filter non-field condition
     * @param {*} condition     
     * @param {bool} [nonEmpty=false] - Require the condition to be non-empty, e.g. findOne
     */
    static _filterCondition(condition, nonEmpty) {
        let fields = Object.keys(this.meta.fields);        

        if (_.isPlainObject(condition)) {
            condition = _.pick(condition, fields);
        } else if (Array.isArray(condition)) {
            condition = condition.map(c => this._filterCondition(c, fields));
        }        

        if (nonEmpty && _.isEmpty(condition)) {
            throw new ModelOperationError('Empty condition.', this.meta.name);
        }

        return condition;
    }    
}

module.exports = Model;