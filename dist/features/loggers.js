'use strict';const winston=require('winston'),winstonFlight=require('winstonflight'),Mowa=require('../server.js'),Util=Mowa.Util,Promise=Util.Promise;module.exports={type:Mowa.Feature.SERVICE,load_:function(appModule,categories){let loggers=new winston.Container;Util._.forOwn(categories,(loggerConfig,name)=>{if(loggerConfig.transports){loggerConfig.transports=winstonFlight(loggerConfig.transports)}let logger=loggers.add(name,loggerConfig);appModule.registerService('logger:'+name,logger)});appModule.registerService('loggers',loggers);return Promise.resolve()}};