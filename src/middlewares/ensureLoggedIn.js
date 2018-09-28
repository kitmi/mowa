"use strict";

const Mowa = require('../server.js');
const Util = require('../util.js'); 

/**
 * @module Middleware_EnsureLoggedIn
 * @summary Middleware to check user logged in status based on passport
 */

/**
 * Initialize ensureLoggedIn middleware
 * @param {object} options
 * @param {AppModule} appModule
 */  
module.exports = (options, appModule) => {
    let passportService = appModule.getService('passport');    

    options = Object.assign({ store: 'session', loginUrl: '/login', redirectToUrlFieldName: 'redirectToUrl' }, passportService.config.localAuth, options);

    if (options.store !== 'session' && options.store !== 'url') {
        throw new Mowa.Error.InvalidConfiguration(
            'Invalid store type',
            appModule,
            'passport.localAuth.store'
        );
    }

    return async (ctx, next) => {
        if (ctx.isAuthenticated()) {
            await next();
        } else {
            if (options.store === 'session') {
                ctx.session[options.redirectToUrlFieldName] = ctx.orginalUrl;
            } else {
                ctx.redirect(Util.urlAppendQuery(appModule.toWebPath(options.loginUrl), { [options.redirectToUrlFieldName]: ctx.orginalUrl }));
            } 
        }
    }
};