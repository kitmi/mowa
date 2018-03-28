'use strict';const Mowa=require('../server.js'),Util=Mowa.Util,session=require('koa-session-minimal');module.exports=(options,appModule)=>{let store=options.store||{type:'memory'};if(!store.type){throw new Mowa.Error.InvalidConfiguration('Missing session store type.',appModule,'middlewares.session.store')}let storeGenerator;switch(store.type){case'redis':storeGenerator=require('koa-redis');break;case'mysql':storeGenerator=require('koa-mysql-session');break;case'mongodb':storeGenerator=require('koa-generic-session-mongo');break;case'pgsql':storeGenerator=require('koa-pg-session');break;case'sqlite3':storeGenerator=require('koa-sqlite3-session');break;case'memory':storeGenerator=()=>{return undefined};break;default:throw new Mowa.Error.InvalidConfiguration('Unsupported session store type: '+store.type,appModule,'middlewares.session.store.type');}let sessionOptions=Object.assign({},options,{store:storeGenerator(store.options)});return session(sessionOptions)};