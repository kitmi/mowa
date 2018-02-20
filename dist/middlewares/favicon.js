'use strict';const Mowa=require('../server.js');const Util=Mowa.Util;const _=Util._;const fs=Util.fs;const path=require('path');let favicon=(options,appModule)=>{let faviconPath;if(_.isString(options)){faviconPath=options;options={}}else{faviconPath=options.path||path.join(appModule.frontendStaticPath,'favicon.ico')}let icon;const maxAge=options.maxAge==null?86400000:Math.min(Math.max(0,options.maxAge),31556926000);const cacheControl=`public, max-age=${maxAge/1000|0}`;return async(ctx,next)=>{if('/favicon.ico'!==ctx.path){await next();return}if(!icon){let stats=await fs.stat(faviconPath);if(stats.size>1048576){appModule.log('warn','favicon.ico too large.',stats);ctx.throw(Mowa.HttpCode.HTTP_NOT_FOUND)}icon=await fs.readFile(faviconPath)}ctx.set('Cache-Control',cacheControl);ctx.type='image/x-icon';ctx.body=icon}};favicon.__metaMatchMethods=['get','head'];module.exports=favicon;