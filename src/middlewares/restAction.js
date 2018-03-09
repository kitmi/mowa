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
                ctx.body = await ctrl.query(ctx);
                break;

            case 'create':
                ctx.body = await ctrl.create(ctx);
                break;

            case 'get':
                ctx.body = await ctrl.get(ctx);
                break;

            case 'update':
                ctx.body = await ctrl.update(ctx);
                break;

            case 'delete':
                ctx.body = await ctrl.remove(ctx);
                break;

            default:
                ctx.throw(Mowa.HttpCode.HTTP_BAD_REQUEST);
        }
    };
};