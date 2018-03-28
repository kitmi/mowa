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

        let [ result ] = await conn.query(sql);

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

        let conn = await this.db.service.getConnection();

        let keyClauses = [];
        let values = [ this.meta.name ];

        _.forOwn(condition, (value, key) => {
            keyClauses.push(conn.escapeId(key) + ' = ?');
            values.push(value);
        });

        let sql = 'SELECT * FROM ?? WHERE ' + keyClauses.join(' AND ');
        sql = conn.format(sql, values);

        if (this.db.appModule.oolong.logSqlStatement) {
            this.db.appModule.log('verbose', sql);
        }

        let [rows] = await conn.query(sql);

        return rows.length > 0 ? rows[0] : undefined;
    }

    static async _doFind(condition) {
        let conn = await this.db.service.getConnection();

        let keyClauses = [];
        let values = [ this.meta.name ];
        
        _.forOwn(condition, (value, key) => {
            keyClauses.push(conn.escapeId(key) + ' = ?');
            values.push(value);
        });      

        let sql = 'SELECT * FROM ??';
        if (!_.isEmpty(keyClauses)) {
            sql += ' WHERE ' + keyClauses.join(' AND ');
        }

        sql = conn.format(sql, values);

        if (this.db.appModule.oolong.logSqlStatement) {
            this.db.appModule.log('verbose', sql);
        }

        let [rows] = await conn.query(sql);

        return rows;
    }

    static async _doRemoveOne(condition) {
        if (_.isEmpty(condition)) {
            throw new Errors.ModelOperationError('Empty condition.', this.meta.name);
        }

        let conn = await this.db.service.getConnection();

        let keyClauses = [];
        let values = [ this.meta.name ];

        _.forOwn(condition, (value, key) => {
            keyClauses.push(conn.escapeId(key) + ' = ?');
            values.push(value);
        });
        
        let sql;
        
        if (this.meta.features.logicalDeletion) {
            let fieldName = this.meta.features.logicalDeletion.field;
            sql = 'UPDATE ?? SET ? WHERE ' + keyClauses.join(' AND ');
            values.splice(1, 0, { [fieldName]: true });
            
        } else {
            sql = 'DELETE FROM ?? WHERE ' + keyClauses.join(' AND ');
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
}

module.exports = MysqlModel;