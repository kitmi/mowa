"use strict";

const _ = require('lodash');
const mysql = require('mysql');
const Errors = require('./errors.js');
const { ModelValidationError, ModelOperationError } = Errors;
const Generators = require('./generators.js');
const Validators = require('./validators.js');

function *modelPreCreate(webModule, ModelMeta, rawData) {
    let validateAll = ModelMeta.flags.validateAllFieldsOnCreation;
    let errors = [], warnings = [];
    let newData = {}, dbFunctionCalls = [];

    for (let name in ModelMeta.fields) {        
        let info = ModelMeta.fields[name];
        if (name in rawData) {
            if (info.readOnly) {
                if (webModule.env === 'development') {
                    warnings.push(new ModelOperationError(ModelOperationError.UPDATE_READ_ONLY_FIELD, name));
                }
            } else {
                let validation = yield Validators.validateAndSanitize(info, rawData[name]);
                if (validation.error) {
                    errors.push(new ModelValidationError(ModelValidationError.INVALID_VALUE, name, validation.error));

                    if (!validateAll)
                        return {errors};
                }
                newData[name] = validation.sanitized;
                continue;
            }
        }
        
        if (!info.defaultByDb) {
            if ('default' in info) {
                if (_.isPlainObject(info.default)) {
                    if (info.default.type === 'Generator') {
                        newData[name] = yield Generators.generate(info);
                    } else if (info.default.type === 'DbFunction') {
                        dbFunctionCalls.push({
                            field: name,
                            dbFunction: info.default
                        });
                    }
                } else {
                    newData[name] = info.default;
                }
            } else if (!info.optional) {
                errors.push(new ModelValidationError(ModelValidationError.MISSING_REQUIRED_VALUE, name));

                if (!validateAll)
                    return {errors};
            }
        }
    }

    if (errors.length > 0) {
        return {
            errors,
            warnings
        };
    }

    return { warnings, newData, dbFunctionCalls };
}

function *mysqlModelCreate(webModule, ModelMeta, rawData, newData, dbFunctionCalls) {
    function mysqlBuildDbCallForInsertSql(callDbFunctions, rawData, newData, values) {
        let setClauses = [];
        _.each(callDbFunctions, callInfo => {
            let callFmt = callInfo.dbFunction.name + '(';

            if (!_.isEmpty(callInfo.dbFunction.arguments)) {
                callFmt += _.fill(Array(callInfo.dbFunction.arguments.length), '?').join(', ');

                _.each(callInfo.dbFunction.arguments, a => {
                    if (_.isPlainObject(a) && a.type == 'ObjectReference') {
                        let p = a.name.split('.');
                        let fieldName = p.pop();

                        if (p.length == 0 || p[0] == 'new') {
                            if (!(fieldName in newData)) throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'new.' + fieldName);
                            values.push(newData[fieldName]);
                        } else if (p[0] == 'existing') {
                            throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'existing.' + fieldName);
                        } else if (p[0] == 'raw') {
                            if (!(fieldName in rawData)) throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'raw.' + fieldName);
                            values.push(rawData[fieldName]);
                        } else {
                            throw new ModelOperationError(ModelOperationError.UNEXPECTED_STATE, a.name);
                        }
                    } else {
                        values.push(a);
                    }
                });
            }

            callFmt += ')';

            setClauses.push(mysql.escapeId(callInfo.field) + ' = ' + callFmt);
        });

        return setClauses.join(', ') + ', ';
    }

    let sql = 'INSERT INTO ?? SET ';
    let values = [ModelMeta.modelName];
    if (!_.isEmpty(dbFunctionCalls)) {
        sql += mysqlBuildDbCallForInsertSql(dbFunctionCalls, rawData, newData, values);
    }
    sql += '?';
    values.push(newData);

    console.log(sql);
    console.dir(values);

    sql = mysql.format(sql, values);

    if (webModule.options.logSqlStatement) {
        webModule.log('verbose', sql);
    }

    let dbService = webModule.getService(ModelMeta.connectionId);
    let db = yield dbService.getConnection(true);
    return yield db.query(sql);
}

module.exports = {
    modelPreCreate,
    mysqlModelCreate
};