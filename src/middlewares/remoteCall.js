"use strict";

/**
 * @module Middleware_RemoteCall
 * @summary Remote call middleware
 */

const Mowa = require('../server.js');

module.exports = (options, appModule) => {
    return async (ctx, next) => {
        let ctrlName = ctx.params.controller;

        if (!options.controllers.has(ctrlName)) {
            return next();
        }

        ctx.appModule = appModule;

        let ctrl = options.controllers.get(ctrlName);
        let method = ctx.body.method;

        if (!method || typeof ctrl[method] !== 'function') {
            ctx.throw(Mowa.HttpCode.HTTP_BAD_REQUEST);
        }

        let actioner = ctrl[method];
        await actioner(ctx);

        return next();
    };
};