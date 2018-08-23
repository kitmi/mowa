'use strict';const Util=require('../../util.js'),{URL}=require('url');let DbService=class DbService{constructor(appModule,type,name,options){this.appModule=appModule;this.dbType=type;this.dbmsSpec=options.spec;this.name=name;this.serviceId=type+':'+name;this.connectionString=options.connection;this.connectionComponents=new URL(this.connectionString);this.physicalDbName=this.connectionComponents.pathname.substr(1);this.physicalDbType=this.connectionComponents.protocol.split(':',2)[0]}async getConnection(options){throw new Error(Util.Message.DBC_NOT_IMPLEMENTED)}closeConnection(conn){throw new Error(Util.Message.DBC_NOT_IMPLEMENTED)}};module.exports=DbService;