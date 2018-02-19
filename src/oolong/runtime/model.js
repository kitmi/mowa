"use strict";

const Mowa = require('../../server.js');
const Util = Mowa.Util;
const _ = Util._;

const Errors = require('./errors.js');
const { ModelValidationError, ModelOperationError } = Errors;

const Sanitizers = require('./sanitizers.js');
const Generators = require('./generators.js');
const Validators = require('./validators.js');

class ModelOperator {
    /**
     * Model operator, provide CRUD functions
     *      
     * @constructs ModelOperator
     * @param {Object} meta
     * @param {Object} [rawData] - Mapped object
     */
    constructor(meta, rawData) {
        this.name = meta.name;
        this.meta = meta;
        this.data = rawData;
        this.newEntity = true;
    }

    findOne(condition) {
        
    }

    async save(ctx) {        
        if (this.newEntity) {
            let createState = await this._preCreate(ctx);
            if (createState.errors) {
                throw new ModelValidationError(createState.errors);
            }
            this._doCreate(ctx, createState);
        } else {
            let updateState = await this._preCreate(ctx);
            if (updateState.errors) {
                throw new ModelValidationError(updateState.errors);
            }
            this._doUpdate(ctx, updateState);
        }
    }

    remove() {
        
    }    
    
    async _preCreate(ctx) {
        let validateAll = this.meta.flags.validateAllFieldsOnCreation;
        let errors = [];
        let newData = {}, dbFunctionCalls = [];
        let appModule = ctx.appModule;
        
        for (let fieldName in this.meta.fields) {
            let fieldMeta = this.meta.fields[fieldName];

            if (fieldName in this.data) {
                if (fieldMeta.readOnly) {
                    if (appModule.env !== 'production') {
                        throw new ModelOperationError(ModelOperationError.UPDATE_READ_ONLY_FIELD, fieldName);
                    }
                } else {
                    let validation = await Validators.validateAndSanitize_(fieldMeta, this.data[fieldName]);
                    if (validation.error) {
                        errors.push(validation.error);

                        if (!validateAll)
                            return { errors };
                    }
                    newData[fieldName] = validation.sanitized;
                    continue;
                }
            }

            if (!fieldMeta.defaultByDb) {
                if ('default' in fieldMeta) {
                    if (_.isPlainObject(fieldMeta.default)) {
                        if (fieldMeta.default.type === 'Generator') {
                            newData[fieldName] = await Generators.generate(fieldMeta);
                        } else if (fieldMeta.default.type === 'DbFunction') {
                            dbFunctionCalls.push({
                                field: fieldName,
                                dbFunction: fieldMeta.default
                            });
                        }
                    } else {
                        newData[fieldName] = fieldMeta.default;
                    }
                } else if (!fieldMeta.optional) {
                    errors.push({ field: fieldMeta, message: 'Missing required field.' });

                    if (!validateAll)
                        return { errors };
                }
            }
        }

        if (errors.length > 0) {
            return { errors };
        }

        return { newData, dbFunctionCalls };
    }
    
    async _doCreate(ctx, creationState) {
        
    }
}

module.exports = ModelOperator;