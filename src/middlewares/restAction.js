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

        switch (options.type) {
            case 'query':
                return ctrl.query(ctx);
                break;

            case 'create':
                return ctrl.create(ctx);
                break;

            case 'get':
                return ctrl.get(ctx);
                break;

            case 'update':
                return ctrl.update(ctx);
                break;

            case 'delete':
                return ctrl.remove(ctx);
                break;

            default:
                ctx.throw(Mowa.HttpCode.HTTP_BAD_REQUEST);
        }
    };
};