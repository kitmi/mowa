"use strict";

/**
 * @module Middleware_ResponseTime
 * @summary Response time middleware adds a x-response-time header field in http response
 */

module.exports = (opt, appModule) => {

    let logger;

    if (opt.logger) {
        logger = appModule.getService('logger:' + opt.logger);
    }

    return async (ctx, next) => {
        const start = Date.now();
        await next();
        const ms = Date.now() - start;
        ctx.set('X-Response-Time', `${ms}ms`);

        if (logger) {
            logger.log('info', `${ctx.method} ${ctx.url} - ${ms}`);
        }
    };
};