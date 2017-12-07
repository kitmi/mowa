"use strict";

const Schema = require('../schema.js');

class MysqlSchema extends Schema {
    /**
     * Mysql schema object
     *
     * @constructs MysqlSchema
     * @extends Schema
     */
    constructor(appModule, name) {
        super(appModule, name, 'mysql');
        
        
    }
    
    *save(ModelMeta, rawData, newData, dbFunctionCalls) {
        function mysqlBuildDbCallForInsertSql(callDbFunctions, rawData, newData, values) {
            let setClauses = [];
            _.each(callDbFunctions, callInfo => {
                let callFmt = callInfo.dbFunction.name + '(';

                if (!_.isEmpty(callInfo.dbFunction.args)) {
                    callFmt += _.fill(Array(callInfo.dbFunction.args.length), '?').join(', ');

                    _.each(callInfo.dbFunction.args, a => {
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

        if (appModule.options.logSqlStatement) {
            appModule.log('verbose', sql);
        }

        let dbService = appModule.getService(ModelMeta.connectionId);
        let db = yield dbService.getConnection(true);
        return yield db.query(sql);
    
    }
    
    
}

module.exports = MysqlSchema;