'use strict';const Mowa=require('../server.js'),Util=Mowa.Util,_=Util._;module.exports=(options,appModule)=>{return async(ctx,next)=>{let ctrlName=ctx.params.resource;if(!options.controllers.has(ctrlName)){return next()}ctx.appModule=appModule;let ctrl=options.controllers.get(ctrlName);ctx.type='application/json';try{ctx.body=await ctrl[options.type](ctx)}catch(error){if(error.status){ctx.status=error.status}else{ctx.status=500}let message;if('production'===appModule.env){message=error.message||error}else{message=error.stack||error}ctx.body={error:message};await next();if(500<=ctx.status){appModule.log('error',error.stack||error.toString(),{query:ctx.request.query,fields:ctx.request.fields})}}}};