"use strict";

const Model = require('../model.js');

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;

const Errors = require('../errors.js');

class MysqlModel extends Model {
    async _doCreate(context, ignoreDuplicate, retrieveSaved) {
        let conn = await this.db.conn_();

        let sql = 'INSERT INTO ?? SET ?';
        let values = [ this.meta.name ];
        values.push(context.latest);

        sql = conn.format(sql, values);
                
        if (this.appModule.oolong.logSqlStatement) {
            this.appModule.log('verbose', sql);
        }

        let result, hasDuplicate;

        try {
            [ result ] = await conn.query(sql);
        } catch (error) {
            if (error.code && error.code === 'ER_DUP_ENTRY') {
                if (!ignoreDuplicate) {
                    let field = error.message.split("' for key '").pop();
                    field = field.substr(0, field.length-1);

                    throw new Errors.ModelValidationError({ code: error.code, message: error.message, field: this.meta.fields[field] });
                } else {
                    hasDuplicate = true;
                }
            } else {
                throw error;
            }
        }
        
        if (result.affectedRows !== 1 && !hasDuplicate) {
            throw new Errors.ModelResultError('Insert operation may fail. "affectedRows" is 0.');
        }

        let autoIdFeature = this.meta.features.autoId;
        if (autoIdFeature && this.meta.fields[autoIdFeature.field].autoIncrementId) {              
            if (!hasDuplicate) {
                if ('insertId' in result) {
                    if (retrieveSaved) {
                        return this.constructor.findOne({[autoIdFeature.field]: result.insertId });
                    }
                    context.latest[autoIdFeature.field] = result.insertId;            
                } else {
                    throw new Errors.ModelResultError('Last insert id does not exist in result record.');
                }
            } // if hasDuplicate, the latest record will not 
        } 

        if (!retrieveSaved) {
            return this.fromDb(context.latest);
        }
        
        return this.constructor.findOne(context.latest);
    }
    
    async _doUpdate(context, retrieveSaved) {
        let keyField = this.meta.keyField;
        let keyValue = (keyField in context.latest) ? context.latest[keyField] : context.existing[keyField];

        if (_.isNil(keyValue)) {
            throw new Errors.ModelOperationError('Missing key field on updating.', this.meta.name);
        }

        if (_.isEmpty(context.latest)) {
            throw new Errors.ModelOperationError('Nothing to update.', this.meta.name);
        }

        let conn = await this.db.conn_();

        let sql = 'UPDATE ?? SET ? WHERE ' + conn.escapeId(keyField) + ' = ?';
        let values = [ this.meta.name ];
        values.push(context.latest);
        values.push(keyValue);

        sql = conn.format(sql, values);

        if (this.appModule.oolong.logSqlStatement) {
            this.appModule.log('verbose', sql);
        }

        let [ result ] = await conn.query(sql);

        console.log(result);

        if (result.affectedRows !== 1) {
            throw new Errors.ModelResultError('Update operation may fail. "affectedRows" is 0.');
        }

        if (retrieveSaved) {
            
        }

        return this.fromDb(context.latest);
    }

    static async _doFindOne(condition) {
        let conn = await this.db.conn_();
        
        let values = [ this.meta.name ];       
        
        let ld = this.meta.features.logicalDeletion;
        if (ld) {
            condition = { $and: [ { $not: { [ld.field]: ld.value } }, condition ] };
        }

        let whereClause = this._joinCondition(conn, condition, values);
        
        assert: whereClause, 'Invalid condition';

        let sql = 'SELECT * FROM ?? WHERE ' + whereClause;
        sql = conn.format(sql, values);

        if (this.db.appModule.oolong.logSqlStatement) {
            this.db.appModule.log('verbose', sql);
        }

        let [rows] = await conn.query(sql);

        return rows.length > 0 ? rows[0] : undefined;
    }

    static async _doFind(condition) {
        let conn = await this.db.conn_();

        let values = [ this.meta.name ];

        let ld = this.meta.features.logicalDeletion;
        if (ld) {
            condition = { $and: [ { [ld.field]: ld.value }, condition ] };
        }

        let whereClause = this._joinCondition(conn, condition, values);
        
        let sql = 'SELECT * FROM ??';
        if (whereClause) {
            sql += ' WHERE ' + whereClause;
        }

        sql = conn.format(sql, values);

        if (this.db.appModule.oolong.logSqlStatement) {
            this.db.appModule.log('verbose', sql);
        }

        let [ rows ] = await conn.query(sql);

        return rows;
    }

    static async _doRemoveOne(condition) {
        let conn = await this.db.conn_();

        let values = [ this.meta.name ];

        let whereClause = this._joinCondition(conn, condition, values);
        
        let sql;
        
        if (this.meta.features.logicalDeletion) {
            let fieldName = this.meta.features.logicalDeletion.field;
            let fieldValue = this.meta.features.logicalDeletion.value; 
            sql = 'UPDATE ?? SET ? WHERE ' + whereClause;
            values.splice(1, 0, { [fieldName]: fieldValue });
            
        } else {
            sql = 'DELETE FROM ?? WHERE ' + whereClause;
        }
        
        sql = conn.format(sql, values);

        if (this.db.appModule.oolong.logSqlStatement) {
            this.db.appModule.log('verbose', sql);
        }

        let [ result ] = await conn.query(sql);

        if (result.affectedRows !== 1) {
            throw new Errors.ModelResultError('Delete operation may fail. "affectedRows" is 0.');
        }

        return true;
    }

    /**
     * SQL condition representation
     *   Rules:
     *     default: 
     *        array: OR
     *        kv-pair: AND
     *     $and: 
     *        array: AND
     *     $or:
     *        kv-pair: OR
     *     $not:
     *        array: not ( or )
     *        kv-pair: not ( and )
     * @param {object} conn 
     * @param {object} condition 
     * @param {array} valuesSeq 
     */
    static _joinCondition(conn, condition, valuesSeq, joinOperator) {
        if (Array.isArray(condition)) {
            if (!joinOperator) {
                joinOperator = 'OR';
            }
            return condition.map(c => this._joinCondition(conn, c, valuesSeq)).join(` ${joinOperator} `);
        }

        if (_.isPlainObject(condition)) { 
            if (!joinOperator) {
                joinOperator = 'AND';
            }
            
            return _.map(condition, (value, key) => {
                if (key === '$and') {
                    assert: Array.isArray(value), '"$and" operator value should be an array.';                    

                    return this._joinCondition(conn, value, valuesSeq, 'AND');
                }
    
                if (key === '$or') {
                    assert: _.isPlainObject(value), '"$or" operator value should be a plain object.';       
                    
                    return this._joinCondition(conn, value, valuesSeq, 'OR');
                }

                if (key === '$not') {                    
                    if (Array.isArray(value)) {
                        assert: value.length > 0, '"$not" operator value should be non-empty.';                     

                        return 'NOT (' + this._joinCondition(conn, value, valuesSeq) + ')';
                    } else if (_.isPlainObject(value)) {
                        let numOfElement = Object.keys(value).length;   
                        assert: numOfElement > 0, '"$not" operator value should be non-empty.';                     

                        if (numOfElement === 1) {
                            let keyOfElement = Object.keys(value)[0];
                            let valueOfElement = value[keyOfElement];

                            return this._wrapCondition(conn, keyOfElement, valueOfElement, valuesSeq, true);
                        }

                        return 'NOT (' + this._joinCondition(conn, value, valuesSeq) + ')';
                    } 

                    assert: typeof value === 'string', 'Unsupported condition!';

                    return 'NOT (' + condition + ')';                    
                }

                return this._wrapCondition(conn, key, value, valuesSeq);
            }).join(` ${joinOperator} `);
        }

        assert: typeof condition === 'string', 'Unsupported condition!';

        return condition;
    }

    /**
     * Wrap a condition clause
     * @param {object} conn 
     * @param {string} key 
     * @param {*} value 
     * @param {array} valuesSeq 
     * @param {bool} [not=false] 
     */
    static _wrapCondition(conn, key, value, valuesSeq, not = false) {
        if (_.isNil(value)) {
            return conn.escapeId(key) + (not ? 'IS NOT NULL' : ' IS NULL');
        }

        valuesSeq.push(value);
        return conn.escapeId(key) + ' ' + (not ? '<>' : '=') + ' ?';
    }
}

module.exports = MysqlModel;