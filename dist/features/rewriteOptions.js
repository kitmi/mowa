'use strict';require('debug')('tracing')(__filename);const Util=require('../util.js');module.exports={type:Util.Feature.INIT,load:function(appModule,config){appModule.options=Object.assign({},appModule.options,config);return Promise.resolve()}};