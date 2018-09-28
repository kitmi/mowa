"use strict";

module.exports = (opt, webModule) => {

    return (ctx, next) => {
        ctx.append('X-TEST-HEADER', 'For test only');
        return next();
    };
};