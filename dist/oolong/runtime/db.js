'use strict';const Mowa=require('../../server.js');let Db=class Db{constructor(appModule,dbServiceId,ctx){this.appModule=appModule;let[dbType,dbName]=dbServiceId.split(':');this.name=dbName;this.dbType=dbType;this.serviceId=dbServiceId;if(ctx){if(!('postActions'in ctx)){throw new Mowa.Error.ServerError('"postActions" middleware is required for auto-close feature of database connection.')}this.ctx=ctx}}get service(){return this.appModule.getService(this.serviceId)}async conn_(){if(!this._conn){this._conn=await this.service.getConnection();if(this.ctx){this.ctx.postActions.push(()=>{this.service.closeConnection(this._conn);delete this._conn})}}return this._conn}};module.exports=Db;