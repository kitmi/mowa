"use strict";

require('debug')('tracing')(__filename);

const koaFavIcon = require('koa-favicon');

let favicon = (opt, appModule) => {
    return koaFavIcon(appModule.toAbsolutePath(opt));
};

favicon.__metaMatchMethods = ['get'];

module.exports = favicon;