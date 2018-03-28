"use strict";

const Util = require('../util.js');

/**
 * @module Middleware_PostAction
 * @summary Post action middleware
 */

module.exports = (opt, appModule) => {
    appModule.hasPostActions = true;

    return async (ctx, next) => {
        ctx.postActions = [];

        await next();
        
        if (!Util._.isEmpty(ctx.postActions)) {
            return Util.eachPromise_(ctx.postActions).then(() => {
                delete ctx.postActions;
            });
        }
    };     
};