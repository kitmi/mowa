"use strict";

/**
 * @module Middleware_RestAction
 * @summary Restful action as middleware
 */

const Mowa = require('../server.js');
const Util = Mowa.Util;
const _ = Util._;

module.exports = (options, appModule) => {
    return async (ctx, next) => {
        let ctrlName = ctx.params.resource;

        if (!options.controllers.has(ctrlName)) {
            return next();
        }

        ctx.appModule = appModule;

        let ctrl = options.controllers.get(ctrlName);

        ctx.type = 'application/json';

        try {
            ctx.body = await ctrl[options.type](ctx);
        } catch (error) {
            if (error.status) {
                ctx.status = error.status;
            } else {
                ctx.status = 500;
            }
            
            if (appModule.env === 'production') {
                ctx.body = { error: error.message || error };
            } else {
                ctx.body = { error: error.stack };
            }
        }
    };
};