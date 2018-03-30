"use strict";

const Mowa = require('../server.js');

/**
 * @module Middleware_Passport
 * @summary Passport initialization middleware, required to initialize Passport service.
 */

/**
 * Create a passport initialization middleware.
 * @param {object} opt - Passport options
 * @property {bool} [opt.useSession=false] - Use session or not, default: false
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
    
    return (opt && opt.useSession) ? passport.initialize() : [ passport.initialize(), passport.session() ];
};

module.exports = createMiddleware;