"use strict";const Mowa=require("../server.js");const Util=Mowa.Util;const Promise=Util.Promise;module.exports={type:Mowa.Feature.INIT,load_:function(appModule,settings){appModule.settings=Object.assign({},appModule.settings,settings);return Promise.resolve()}};