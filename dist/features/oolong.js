'use strict';const path=require('path'),Mowa=require('../server.js'),Util=Mowa.Util,Promise=Util.Promise;module.exports={type:Mowa.Feature.INIT,load_:async(appModule,oolong)=>{appModule.oolong=oolong;appModule.on('after:'+Mowa.Feature.MIDDLEWARE,()=>{if(!appModule.hasPostActions){appModule.useMiddlewares(appModule.router,{postActions:{}})}});appModule.on('after:'+Mowa.Feature.DBMS,()=>{appModule.db=function(dbServiceId,ctx){if(!dbServiceId){throw new Error('"dbServiceId" is required!')}if(ctx&&ctx.db&&dbServiceId in ctx.db){return ctx.db[dbServiceId]}let[dbType,dbName]=dbServiceId.split(':'),dbFile=path.resolve(appModule.backendPath,Mowa.Literal.MODELS_PATH,dbType,dbName+'.js'),Dao=require(dbFile),dao=new Dao(appModule,ctx);if(ctx){ctx.db||(ctx.db={});ctx.db[dbServiceId]=dao}return dao}})}};