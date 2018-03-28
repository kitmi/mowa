"use strict";

const Util = require('../util.js');

module.exports = (opt, appModule) => {
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