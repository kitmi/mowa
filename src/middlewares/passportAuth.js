"use strict";

const Mowa = require('../server.js');
const Util = Mowa.Util;
const Promise = Util.Promise;
const { ModelOperationError } = require('../oolong/runtime/errors');

/**
 * @module Middleware_PassportAuth
 * @summary Passport initialization middleware, required to initialize Passport service.
 */

/**
 * Create a passport authentication middleware.
 * @param {object} opt - Passport options
 * @property {string} opt.strategy - Passport strategy
 * @property {object} [opt.options] - Passport strategy options
 * @property {bool} [opt.customHandler] - Handle authenticate result manually
 * @param {AppModule} appModule
 * @returns {KoaActionFunction}
 */
let createMiddleware = (opt, appModule) => {
    if (!opt || !opt.strategy) {
        throw new Mowa.Error.InvalidConfiguration('Missing strategy name.', appModule, 'middlewares.passportAuth.strategy');
    }
    
    let passport = appModule.getService('passport');

    if (!passport) {
        throw new Mowa.Error.InvalidConfiguration(
            'Passport feature is not enabled.',
            appModule,
            'passport'
        );
    }

    if (opt.customHandler) {
        return (ctx, next) => {
            return passport.authenticate(opt.strategy, opt.options, (err, user, info, status) => {
                if (err) {
                    throw new ModelOperationError(err.Error || err.sqlMessage || err.message, err.code);
                }

                if (user) {
                    return ctx.login(user).then(next);
                }

                ctx.loginError = info;
                if (typeof status === 'number') {
                    ctx.status = status;
                }
                return next();
            })(ctx, next);
        };
    }
    
    return passport.authenticate(opt.strategy, opt.options);
}

module.exports = createMiddleware;