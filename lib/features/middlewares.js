"use strict";

require('debug')('tracing')(__filename);

const Util = require('../util.js');

module.exports = {

    type: Util.Feature.MIDDLEWARE,

    load: function (webModule, middlewares) {

        webModule.useMiddlewares(webModule.router, middlewares);

        return Promise.resolve();
    }
};
