"use strict";

const Mowa = require('../server.js');
const Util = Mowa.Util;

/**
 * @module Middleware_Passport
 * @summary Passport initialization middleware, required to initialize Passport service.
 */

/**
 * Create a passport initialization middleware.
 * @param {object} opt - Passport options
 * @property {bool} [opt.useSession=false] - Use session or not, default: false
 * @property {string} [opt.userProperty='user'] - User property name, default: user
 * @param {AppModule} appModule
 * @returns {KoaActionFunction}
 */
let createMiddleware = (opt, appModule) => {
    let passport = appModule.getService('passport');
    
    if (!passport) {
        throw new Mowa.Error.InvalidConfiguration(
            'Passport feature is not enabled.',
            appModule,
            'passport'
        );
    }

    let localAuth = passport.config.localAuth;
    let loginUrl = appModule.toWebPath(localAuth.loginUrl);

    let passportInject = (ctx, next) => {
        ctx.redirectToLogin = () => {
            let url = ctx.orginalUrl || appModule.toWebPath(ctx.url);

            if (localAuth.store === 'session') {
                ctx.session[localAuth.redirectToUrlFieldName] = url;
            } else {                
                loginUrl = Util.urlAppendQuery(loginUrl, { [localAuth.redirectToUrlFieldName]: url });
            }

            ctx.redirect(loginUrl, url);
        }

        ctx.redirectBack = () => {
            if (ctx.isAuthenticated()) {   
                let backUrl;    
                if (localAuth.store === 'session') {
                    backUrl = ctx.session[localAuth.redirectToUrlFieldName];
                } else {
                    backUrl = ctx.query[localAuth.redirectToUrlFieldName];
                }

                let previousUrl = backUrl || localAuth.defaultLandingPage || ctx.appModule.toWebPath();
                ctx.redirect(previousUrl);
                return true;
            }

            return false;
        }
    
        return next();
    }

    let initOptions = opt ? {} : Util._.pick(opt, [ 'userProperty' ]);
    
    return (opt && opt.useSession) ? [ passport.initialize(initOptions), passport.session(), passportInject ] : [ passport.initialize(initOptions), passportInject ];
};

module.exports = createMiddleware;