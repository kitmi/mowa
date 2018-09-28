"use strict";

const Mowa = require('../server.js');
const Util = Mowa.Util;

/**
 * @module Middleware_PostAction
 * @summary Post action middleware
 */

module.exports = (opt, appModule) => {
    if (appModule.hasPostActions) {
        throw new Mowa.Error.InvalidConfiguration(
            '"postActions" middleware can only be attached once for an app module.',
            appModule,
            'middleware.postActions'
        );
    }

    appModule.hasPostActions = true;

    return async (ctx, next) => {
        const postActions = [];

        ctx.addPostAction = (action) => {
            postActions.push(action);
        };

        ctx.removePostAction = (action) => {
            let pos = postActions.indexOf(action);
            if (pos > -1) {
                postActions.splice(pos, 1);
                return true;
            }

            return false;
        };

        await next();
        
        if (postActions.length > 0) {
            return Util.eachPromise_(postActions);
        }
    };     
};