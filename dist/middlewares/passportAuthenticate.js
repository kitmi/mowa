'use strict';require('debug')('tracing')(__filename);let passportAuthenticate=(opt,appModule)=>{if(!opt||!opt.strategy){appModule.invalidConfig('passportAuthenticate.strategy','Missing "strategy" name for middleware "passportAuthenticate"')}let passport=appModule.getService('passport');return passport.authenticate(opt.strategy,opt.options)};passportAuthenticate.__metaMatchMethods=['post'];module.exports=passportAuthenticate;