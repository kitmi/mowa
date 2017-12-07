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
            await next();
            return;
        }

        ctx.appModule = appModule;

        let ctrl = options.controllers.get(ctrlName);

        switch (options.type) {
            case 'query':
                await ctrl.query(ctx);
                break;

            case 'create':
                await ctrl.create(ctx);
                break;

            case 'get':
                await ctrl.get(ctx);
                break;

            case 'update':
                await ctrl.update(ctx);
                break;

            case 'delete':
                await ctrl.remove(ctx);
                break;
        }
    };
};