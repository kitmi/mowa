"use strict";

const Model = require('../model.js');

const Mowa = require('../../../server.js');
const Util = Mowa.Util;
const _ = Util._;

const Errors = require('../errors.js');

class MysqlModel extends Model {

    async _doCreate(context) {
        let conn = await this.db.conn_();

        let sql = 'INSERT INTO ?? SET ?';
        let values = [ this.meta.name ];
        values.push(context.latest);

        sql = conn.format(sql, values);
                
        if (this.appModule.oolong.logSqlStatement) {
            this.appModule.log('verbose', sql);
        }

        let result;

        try {
            [ result ] = await conn.query(sql);
        } catch (error) {
            if (error.code && error.code === 'ER_DUP_ENTRY') {
                let field = error.message.split("' for key '").pop();
                field = field.substr(0, field.length-1);

                throw new Errors.ModelValidationError({ message: error.message, field: this.meta.fields[field] });
            }
            throw error;
        }

        if (result.affectedRows !== 1) {
            throw new Errors.ModelResultError('Insert operation may fail. "affectedRows" is 0.');
        }

        if (this.meta.features.autoId) {
            context.latest[this.meta.features.autoId.field] = result.insertId;
        }

        return this.fromDb(context.latest);
    }
    
    async _doUpdate(context) {
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

        if (result.affectedRows !== 1) {
            throw new Errors.ModelResultError('Update operation may fail. "affectedRows" is 0.');
        }

        return this.fromDb(context.latest);
    }

    static async _doFindOne(condition) {
        if (_.isEmpty(condition)) {
            throw new Errors.ModelOperationError('Empty condition.', this.meta.name);
        }

        let conn = await this.db.conn_();
        
        let values = [ this.meta.name ];       
        
        let ld = this.meta.features.logicalDeletion;
        if (ld) {
            condition = { $and: [ { [ld.field]: ld.value }, condition ] };
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
        if (_.isEmpty(condition)) {
            throw new Errors.ModelOperationError('Empty condition.', this.meta.name);
        }

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

    static _joinCondition(conn, condition, values) {
        if (Array.isArray(condition)) {
            return condition.map(c => this._joinCondition(conn, c, values)).join(' OR ');
        }

        if (_.isPlainObject(condition)) {
            if (condition.$and) {
                assert: Array.isArray(condition.$and), '$and operator value should be an array.';
                
                return condition.$and.map(subCondition => this._joinCondition(conn, subCondition, values)).join(' AND ') 
                    + this._joinCondition(conn, _.omit(condition, ['$and']), values);
            }
            
            return _.map(condition, (value, key) => {
                values.push(value);
                return conn.escapeId(key) + ' = ?';
            }).join(' AND ');
        }

        assert: typeof(condition) === 'string', 'Unsupported condition';

        return condition;
    }
}

module.exports = MysqlModel;