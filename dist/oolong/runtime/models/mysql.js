'use strict';const Model=require('../model.js'),Mowa=require('../../../server.js'),Util=Mowa.Util,_=Util._,Errors=require('../errors.js');let MysqlModel=class MysqlModel extends Model{async _doCreate(context){let conn=await this.db.conn_(),sql='INSERT INTO ?? SET ?',values=[this.meta.name];values.push(context.latest);sql=conn.format(sql,values);if(this.appModule.oolong.logSqlStatement){this.appModule.log('verbose',sql)}let result;try{[result]=await conn.query(sql)}catch(error){if(error.code&&'ER_DUP_ENTRY'===error.code){let field=error.message.split('\' for key \'').pop();field=field.substr(0,field.length-1);throw new Errors.ModelValidationError({message:error.message,field:this.meta.fields[field]})}throw error}if(1!==result.affectedRows){throw new Errors.ModelResultError('Insert operation may fail. "affectedRows" is 0.')}if(this.meta.features.autoId){context.latest[this.meta.features.autoId.field]=result.insertId}return this.fromDb(context.latest)}async _doUpdate(context){let keyField=this.meta.keyField,keyValue=keyField in context.latest?context.latest[keyField]:context.existing[keyField];if(_.isNil(keyValue)){throw new Errors.ModelOperationError('Missing key field on updating.',this.meta.name)}if(_.isEmpty(context.latest)){throw new Errors.ModelOperationError('Nothing to update.',this.meta.name)}let conn=await this.db.conn_(),sql='UPDATE ?? SET ? WHERE '+conn.escapeId(keyField)+' = ?',values=[this.meta.name];values.push(context.latest);values.push(keyValue);sql=conn.format(sql,values);if(this.appModule.oolong.logSqlStatement){this.appModule.log('verbose',sql)}let[result]=await conn.query(sql);if(1!==result.affectedRows){throw new Errors.ModelResultError('Update operation may fail. "affectedRows" is 0.')}return this.fromDb(context.latest)}static async _doFindOne(condition){if(_.isEmpty(condition)){throw new Errors.ModelOperationError('Empty condition.',this.meta.name)}let conn=await this.db.conn_(),keyClauses=[],values=[this.meta.name];_.forOwn(condition,(value,key)=>{keyClauses.push(conn.escapeId(key)+' = ?');values.push(value)});let sql='SELECT * FROM ?? WHERE '+keyClauses.join(' AND ');sql=conn.format(sql,values);if(this.db.appModule.oolong.logSqlStatement){this.db.appModule.log('verbose',sql)}let[rows]=await conn.query(sql);return 0<rows.length?rows[0]:undefined}static async _doFind(condition){let conn=await this.db.conn_(),keyClauses=[],values=[this.meta.name];_.forOwn(condition,(value,key)=>{keyClauses.push(conn.escapeId(key)+' = ?');values.push(value)});let sql='SELECT * FROM ??';if(!_.isEmpty(keyClauses)){sql+=' WHERE '+keyClauses.join(' AND ')}sql=conn.format(sql,values);if(this.db.appModule.oolong.logSqlStatement){this.db.appModule.log('verbose',sql)}let[rows]=await conn.query(sql);return rows}static async _doRemoveOne(condition){if(_.isEmpty(condition)){throw new Errors.ModelOperationError('Empty condition.',this.meta.name)}let conn=await this.db.conn_(),keyClauses=[],values=[this.meta.name];_.forOwn(condition,(value,key)=>{keyClauses.push(conn.escapeId(key)+' = ?');values.push(value)});let sql;if(this.meta.features.logicalDeletion){let fieldName=this.meta.features.logicalDeletion.field;sql='UPDATE ?? SET ? WHERE '+keyClauses.join(' AND ');values.splice(1,0,{[fieldName]:true})}else{sql='DELETE FROM ?? WHERE '+keyClauses.join(' AND ')}sql=conn.format(sql,values);if(this.db.appModule.oolong.logSqlStatement){this.db.appModule.log('verbose',sql)}let[result]=await conn.query(sql);if(1!==result.affectedRows){throw new Errors.ModelResultError('Delete operation may fail. "affectedRows" is 0.')}return true}};module.exports=MysqlModel;