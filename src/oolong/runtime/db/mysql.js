"use strict";

const ModelOperator = require('../model.js');

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;

class MysqlModelOperator extends ModelOperator {
    /**
     * Mysql model operator
     *
     * @constructs MysqlModelOperator
     * @extends ModelOperator
     * @param {Object} meta
     * @param {Object} [rawData] - Mapped object
     */
    constructor(meta, rawData) {
        super(meta, rawData);
    }
    
    async _doCreate(ctx, createState) {
        let appModule = ctx.appModule;

        let sql = 'INSERT INTO ?? SET ';
        let values = [this.name];
        if (!_.isEmpty(createState.dbFunctionCalls)) {
            sql += this._buildDbCallForInsertSql(createState, values);
        }
        sql += '?';
        values.push(createState.newData);

        console.log(sql);
        console.dir(values);

        sql = mysql.format(sql, values);

        //todo:
        if (appModule.oolong.logSqlStatement) {
            appModule.log('verbose', sql);
        }

        let service = appModule.getService(this.schema.connectionId);
        let db = await service.getConnection(ctx);
        let result = await db.query(sql);
        await service.closeConnection(ctx, db);
        return result;
    }

    _buildDbCallForInsertSql({ dbFunctionCalls, newData }, values) {
        let setClauses = [];
        _.each(dbFunctionCalls, callInfo => {
            let callFmt = callInfo.dbFunction.name + '(';
    
            if (!_.isEmpty(callInfo.dbFunction.args)) {
                callFmt += _.fill(Array(callInfo.dbFunction.args.length), '?').join(', ');
    
                _.each(callInfo.dbFunction.args, a => {
                    if (_.isPlainObject(a) && a.type == 'ObjectReference') {
                        let p = a.name.split('.');
                        let fieldName = p.pop();
    
                        if (p.length === 0 || p[0] === 'new') {
                            if (!(fieldName in newData)) throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'new.' + fieldName);
                            values.push(newData[fieldName]);
                        } else if (p[0] == 'existing') {
                            throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'existing.' + fieldName);
                        } else if (p[0] == 'raw') {
                            if (!(fieldName in this.data)) throw new ModelOperationError(ModelOperationError.REFERENCE_NON_EXIST_VALUE, 'raw.' + fieldName);
                            values.push(this.data[fieldName]);
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
}

module.exports = MysqlModelOperator;